"""
api/views/battle.py

Skill Battle Arena endpoints.

POST /api/v1/battle/find          — find/create a BattleRoom for a skill
GET  /api/v1/battle/room/<id>     — poll room status + questions + scores
POST /api/v1/battle/submit        — submit answers, determine winner, award XP
GET  /api/v1/battle/leaderboard   — top 50 by XP
GET  /api/v1/battle/history       — user's past battles
GET  /api/v1/battle/daily         — today's DailyChallenge
POST /api/v1/battle/daily         — submit daily challenge answer (+25 XP if correct)
"""

from datetime import date

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from api.models import (
    JobSeekerAccount,
    BattleRoom,
    BattleSubmission,
    DailyChallenge,
    XPTransaction,
    DevPulseProfile,
)
from api.views._auth import get_seeker, auth_error
from agents import quiz_generator_agent

XP_WINNER = 150
XP_LOSER  = 50
XP_DAILY  = 25

TOTAL_BATTLE_QUESTIONS = 5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------




def _award_xp(seeker, amount: int, event: str, desc: str):
    XPTransaction.objects.create(
        seeker=seeker, event_type=event, xp_amount=amount, description=desc
    )
    profile = getattr(seeker, "devpulse_profile", None)
    if profile:
        profile.total_xp += amount
        profile.save(update_fields=["total_xp"])
        profile.recalculate_level()


def _grade_battle_answers(questions: list, answers: list) -> int:
    """Return correct answer count for a submitted answer list."""
    correct = 0
    for i, q in enumerate(questions):
        if i < len(answers) and answers[i] == q.get("correct_answer"):
            correct += 1
    return correct


def _room_to_dict(room: BattleRoom, seeker_id=None) -> dict:
    """Serialise a BattleRoom, hiding correct_answer in questions."""
    submissions = {str(s.seeker_id): s for s in room.submissions.all()}

    safe_questions = [
        {"question": q["question"], "options": q["options"]}
        for q in (room.questions or [])
    ]

    my_score   = None
    opp_score  = None
    if seeker_id:
        my_sub  = submissions.get(str(seeker_id))
        my_score = my_sub.score if my_sub else None
        opp_id  = str(room.player2_id) if str(seeker_id) == str(room.player1_id) else str(room.player1_id)
        opp_sub = submissions.get(opp_id)
        opp_score = opp_sub.score if opp_sub else None

    return {
        "room_id":   str(room.room_id),
        "skill":     room.skill,
        "status":    room.status,
        "questions": safe_questions if room.status == "active" else [],
        "my_score":  my_score,
        "opp_score": opp_score,
        "winner_id": str(room.winner_id) if room.winner_id else None,
        "created_at":room.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# POST /api/v1/battle/find
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def find_battle(request):
    """
    Find a waiting BattleRoom for the given skill, or create one.

    Body: { "skill": "React" }
    Returns: { room_id, status: "waiting"|"active" }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    skill = str(request.data.get("skill", "")).strip()
    if not skill:
        return Response(
            {"success": False, "message": "'skill' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        # Look for an open room (waiting, not created by this user)
        room = (
            BattleRoom.objects
            .select_for_update()
            .filter(skill__iexact=skill, status="waiting")
            .exclude(player1=seeker)
            .first()
        )

        if room:
            # Join existing room as player2
            room.player2 = seeker
            room.status  = "active"

            # Generate questions now (both players use same set)
            try:
                questions = quiz_generator_agent.generate_quiz(skill, "medium")
                room.questions = questions[:TOTAL_BATTLE_QUESTIONS]
            except Exception:
                room.questions = []

            room.save(update_fields=["player2", "status", "questions"])
            joined = True
        else:
            # Create a new waiting room
            room = BattleRoom.objects.create(
                player1 = seeker,
                skill   = skill,
                status  = "waiting",
            )
            joined = False

    return Response(
        {
            "success": True,
            "data": {
                "room_id": str(room.room_id),
                "status":  room.status,
                "joined":  joined,
                "skill":   skill,
            },
        },
        status=status.HTTP_201_CREATED if not joined else status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/battle/room/<room_id>
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_room(request, room_id: str):
    """Poll room status. Returns safe questions (no correct_answer) when active."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    try:
        room = (
            BattleRoom.objects
            .prefetch_related("submissions")
            .get(room_id=room_id)
        )
    except BattleRoom.DoesNotExist:
        return Response(
            {"success": False, "message": "Room not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check seeker is a participant
    if seeker not in (room.player1, room.player2):
        return Response(
            {"success": False, "message": "You are not in this battle room."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response({"success": True, "data": _room_to_dict(room, seeker.id)})


# ---------------------------------------------------------------------------
# POST /api/v1/battle/submit
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_battle(request):
    """
    Submit answers for a battle.

    Body: { "room_id": "...", "answers": [0,2,1,...], "time_taken": 120 }

    If both players have submitted → determine winner, award XP, set status=done.
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    room_id    = str(request.data.get("room_id", ""))
    answers    = request.data.get("answers", [])
    time_taken = int(request.data.get("time_taken", 0))

    try:
        room = (
            BattleRoom.objects
            .select_related("player1", "player2")
            .prefetch_related("submissions")
            .get(room_id=room_id, status="active")
        )
    except BattleRoom.DoesNotExist:
        return Response(
            {"success": False, "message": "Active battle room not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if seeker not in (room.player1, room.player2):
        return Response(
            {"success": False, "message": "You are not in this battle room."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Calculate score
    score = _grade_battle_answers(room.questions or [], answers)

    # Create or update submission (idempotent)
    sub, created = BattleSubmission.objects.get_or_create(
        room=room, seeker=seeker,
        defaults={"answers": answers, "score": score, "time_taken_seconds": time_taken},
    )
    if not created:
        # Already submitted
        return Response(
            {"success": False, "message": "You have already submitted for this battle."},
            status=status.HTTP_409_CONFLICT,
        )

    # Check if both submitted
    all_subs = list(BattleSubmission.objects.filter(room=room))
    both_done = len(all_subs) == 2

    winner        = None
    result_status = "submitted"

    if both_done:
        s1 = next((s for s in all_subs if s.seeker_id == room.player1_id), None)
        s2 = next((s for s in all_subs if s.seeker_id == room.player2_id), None)

        if s1 and s2:
            if s1.score > s2.score:
                winner = room.player1
            elif s2.score > s1.score:
                winner = room.player2
            else:
                # Tie → faster player wins
                winner = room.player1 if (s1.time_taken_seconds <= s2.time_taken_seconds) else room.player2

        room.winner = winner
        room.status = "done"
        room.save(update_fields=["winner", "status"])
        result_status = "done"

        # Award XP to both players
        if winner:
            loser = room.player2 if winner == room.player1 else room.player1
            _award_xp(winner, XP_WINNER, "battle_win",  f"Won {room.skill} battle")
            if loser:
                _award_xp(loser,  XP_LOSER,  "battle_loss", f"Participated in {room.skill} battle")
        else:
            # Tie — both get winner XP
            _award_xp(room.player1, XP_WINNER, "battle_tie", f"Tied {room.skill} battle")
            if room.player2:
                _award_xp(room.player2, XP_WINNER, "battle_tie", f"Tied {room.skill} battle")

    is_winner = (winner is not None and winner.id == seeker.id)

    return Response(
        {
            "success": True,
            "data": {
                "score":         score,
                "total":         len(room.questions or []),
                "status":        result_status,
                "both_done":     both_done,
                "is_winner":     is_winner,
                "is_tie":        (both_done and winner is None),
                "xp_gained":     XP_WINNER if (both_done and (is_winner or winner is None)) else (XP_LOSER if both_done else 0),
                "winner_id":     str(winner.id) if winner else None,
            },
        }
    )


# ---------------------------------------------------------------------------
# GET /api/v1/battle/leaderboard
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def leaderboard(request):
    """Top 50 DevPulseProfiles by total_xp."""
    profiles = (
        DevPulseProfile.objects
        .select_related("seeker")
        .order_by("-total_xp")[:50]
    )
    data = [
        {
            "rank":        i + 1,
            "username":    p.username or p.seeker.full_name,
            "level":       p.level,
            "total_xp":    p.total_xp,
            "target_role": p.target_role or "",
        }
        for i, p in enumerate(profiles)
    ]
    return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# GET /api/v1/battle/history
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def battle_history(request):
    """User's past BattleRooms (as player1 or player2)."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    rooms = (
        BattleRoom.objects
        .filter(Q(player1=seeker) | Q(player2=seeker), status="done")
        .select_related("player1", "player2", "winner")
        .prefetch_related("submissions")
        .order_by("-created_at")[:20]
    )

    data = []
    for room in rooms:
        my_sub = room.submissions.filter(seeker=seeker).first()
        result = "tie"
        if room.winner_id == seeker.id:
            result = "win"
        elif room.winner_id is not None:
            result = "loss"
        data.append(
            {
                "room_id":   str(room.room_id),
                "skill":     room.skill,
                "result":    result,
                "my_score":  my_sub.score if my_sub else 0,
                "created_at":room.created_at.isoformat(),
            }
        )

    return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# GET + POST /api/v1/battle/daily
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def daily_challenge(request):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    today = date.today()

    if request.method == "GET":
        challenge = DailyChallenge.objects.filter(challenge_date=today).first()
        if not challenge:
            return Response(
                {"success": False, "message": "No daily challenge available today."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": True,
                "data": {
                    "id":       str(challenge.id),
                    "skill":    challenge.skill,
                    "question": challenge.question,
                    "options":  challenge.options,
                    "date":     str(challenge.challenge_date),
                },
            }
        )

    # POST — submit answer
    answer_idx = request.data.get("answer")
    if answer_idx is None:
        return Response(
            {"success": False, "message": "'answer' (0-indexed int) is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    challenge = DailyChallenge.objects.filter(challenge_date=today).first()
    if not challenge:
        return Response(
            {"success": False, "message": "No daily challenge today."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check already answered today
    already = XPTransaction.objects.filter(
        seeker=seeker, event_type="daily_challenge", created_at__date=today
    ).exists()

    if already:
        return Response(
            {"success": False, "message": "You've already answered today's challenge."},
            status=status.HTTP_409_CONFLICT,
        )

    correct   = int(answer_idx) == challenge.correct_answer
    xp_gained = XP_DAILY if correct else 0

    if xp_gained:
        _award_xp(seeker, xp_gained, "daily_challenge", f"Daily challenge: {challenge.skill}")

    # Even if wrong, record an attempt (0 XP) to prevent re-trying
    if not correct:
        XPTransaction.objects.create(
            seeker=seeker, event_type="daily_challenge", xp_amount=0,
            description=f"Daily challenge attempt: {challenge.skill}",
        )

    return Response(
        {
            "success": True,
            "data": {
                "correct":      correct,
                "xp_gained":    xp_gained,
                "correct_option": challenge.options[challenge.correct_answer] if challenge.options else "",
                "explanation":  f"The correct answer was option {challenge.correct_answer + 1}.",
            },
        }
    )
