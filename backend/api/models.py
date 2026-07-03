import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ---------------------------------------------------------------------------
# 1. JobSeekerAccount
# ---------------------------------------------------------------------------

class JobSeekerAccount(models.Model):
    """Core user account for every job seeker on the platform."""

    TIER_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default="")
    location = models.CharField(max_length=150, blank=True, default="")
    headline = models.CharField(max_length=255, blank=True, default="")

    # Resume storage
    resume_file_path = models.CharField(max_length=500, blank=True, default="")
    resume_data = models.JSONField(default=dict, blank=True)
    enhanced_resume = models.JSONField(default=dict, blank=True)

    skills = models.JSONField(default=list, blank=True)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default="free")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_seeker_account"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


# ---------------------------------------------------------------------------
# 2. DevPulseProfile  (1:1 with JobSeekerAccount)
# ---------------------------------------------------------------------------

class DevPulseProfile(models.Model):
    """Gamification profile linked 1-to-1 with a JobSeekerAccount."""

    LEVEL_THRESHOLDS = [
        (12000, "Legend"),
        (7000, "Principal"),
        (3500, "Senior"),
        (1500, "Mid"),
        (500, "Junior"),
        (0, "Intern"),
    ]

    LEVEL_CHOICES = [
        ("Intern", "Intern"),
        ("Junior", "Junior"),
        ("Mid", "Mid"),
        ("Senior", "Senior"),
        ("Principal", "Principal"),
        ("Legend", "Legend"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.OneToOneField(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="devpulse_profile",
    )
    username = models.CharField(max_length=60, unique=True, null=True, blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="Intern")
    total_xp = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_activity = models.DateField(null=True, blank=True)
    career_health_score = models.IntegerField(default=0)
    target_role = models.CharField(max_length=150, null=True, blank=True)
    github_url = models.URLField(null=True, blank=True)
    linkedin_url = models.URLField(null=True, blank=True)

    class Meta:
        db_table = "devpulse_profile"

    def recalculate_level(self):
        """Recalculate and persist the level based on current total_xp."""
        for threshold, label in self.LEVEL_THRESHOLDS:
            if self.total_xp >= threshold:
                self.level = label
                break
        self.save(update_fields=["level"])

    def __str__(self):
        return f"{self.seeker.full_name} — {self.level} ({self.total_xp} XP)"


# ---------------------------------------------------------------------------
# 3. XPTransaction
# ---------------------------------------------------------------------------

class XPTransaction(models.Model):
    """Ledger entry every time a seeker gains (or loses) XP."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="xp_transactions",
    )
    event_type = models.CharField(max_length=60)
    xp_amount = models.IntegerField()
    description = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "xp_transaction"
        ordering = ["-created_at"]

    def __str__(self):
        sign = "+" if self.xp_amount >= 0 else ""
        return f"{self.seeker.full_name}: {sign}{self.xp_amount} XP [{self.event_type}]"


# ---------------------------------------------------------------------------
# 4. UserBadge
# ---------------------------------------------------------------------------

class UserBadge(models.Model):
    """Badge awarded to a seeker for a specific achievement."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="badges",
    )
    badge_name = models.CharField(max_length=60)
    badge_icon = models.CharField(max_length=10)  # emoji
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_badge"
        unique_together = [("seeker", "badge_name")]
        ordering = ["-earned_at"]

    def __str__(self):
        return f"{self.badge_icon} {self.badge_name} — {self.seeker.full_name}"


# ---------------------------------------------------------------------------
# 5. UserSkill
# ---------------------------------------------------------------------------

class UserSkill(models.Model):
    """A skill associated with a seeker's profile."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="user_skills",
    )
    skill_name = models.CharField(max_length=100)
    domain = models.CharField(max_length=100, null=True, blank=True)
    is_certified = models.BooleanField(default=False)
    is_self_marked = models.BooleanField(default=False)
    xp_contribution = models.IntegerField(default=0)

    class Meta:
        db_table = "user_skill"
        unique_together = [("seeker", "skill_name")]

    def __str__(self):
        certified = " ✓" if self.is_certified else ""
        return f"{self.skill_name}{certified} ({self.seeker.full_name})"


# ---------------------------------------------------------------------------
# 6. Certificate
# ---------------------------------------------------------------------------

class Certificate(models.Model):
    """Earned certificate for passing a skill assessment."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="certificates",
    )
    skill_name = models.CharField(max_length=100)
    score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    # e.g. DP-2025-REACT-4829
    unique_cert_id = models.CharField(max_length=30, unique=True)
    pdf_path = models.CharField(max_length=500, null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "certificate"
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.unique_cert_id} — {self.skill_name} ({self.score}/100)"


# ---------------------------------------------------------------------------
# 7. QuizAttempt
# ---------------------------------------------------------------------------

class QuizAttempt(models.Model):
    """Record of a seeker's quiz attempt for a skill."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
    )
    skill_name = models.CharField(max_length=100)
    score = models.IntegerField()
    passed = models.BooleanField()
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "quiz_attempt"
        ordering = ["-attempted_at"]

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        return f"{self.seeker.full_name} — {self.skill_name} [{status}] {self.score}"


# ---------------------------------------------------------------------------
# 8. ResumeDraft
# ---------------------------------------------------------------------------

class ResumeDraft(models.Model):
    """A versioned resume draft belonging to a seeker."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="resume_drafts",
    )
    title = models.CharField(max_length=200)
    template_id = models.CharField(max_length=50, default="modern")
    content = models.JSONField(default=dict)
    ats_score = models.FloatField(null=True, blank=True)
    ats_report = models.JSONField(null=True, blank=True)
    exported_pdf_path = models.CharField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resume_draft"
        ordering = ["-updated_at"]

    def __str__(self):
        active = " [ACTIVE]" if self.is_active else ""
        return f"{self.title}{active} — {self.seeker.full_name}"


# ---------------------------------------------------------------------------
# 9. InterviewSession
# ---------------------------------------------------------------------------

class InterviewSession(models.Model):
    """A mock interview session started by a seeker."""

    ROUND_CHOICES = [
        ("technical", "Technical"),
        ("hr", "HR"),
        ("system_design", "System Design"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="interview_sessions",
    )
    role = models.CharField(max_length=100)
    round_type = models.CharField(max_length=20, choices=ROUND_CHOICES)
    readiness_score = models.IntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_session"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.seeker.full_name} — {self.role} ({self.round_type})"


# ---------------------------------------------------------------------------
# 10. InterviewAnswer
# ---------------------------------------------------------------------------

class InterviewAnswer(models.Model):
    """Single Q&A pair within an InterviewSession."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.TextField()
    user_answer = models.TextField(blank=True, default="")
    ai_score = models.IntegerField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True, default="")
    model_answer = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_answer"
        ordering = ["created_at"]

    def __str__(self):
        preview = self.question[:60] + ("..." if len(self.question) > 60 else "")
        return f"[Session {self.session_id}] {preview}"


# ---------------------------------------------------------------------------
# 11. BattleRoom
# ---------------------------------------------------------------------------

class BattleRoom(models.Model):
    """Real-time skill battle lobby between two seekers."""

    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("active", "Active"),
        ("done", "Done"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    room_id = models.UUIDField(unique=True, default=uuid.uuid4)
    skill = models.CharField(max_length=100)

    player1 = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="battle_rooms_as_p1",
    )
    player2 = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battle_rooms_as_p2",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="waiting")
    winner = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battle_wins",
    )
    questions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "battle_room"
        ordering = ["-created_at"]

    def __str__(self):
        p2 = self.player2.full_name if self.player2 else "waiting..."
        return f"Room {self.room_id} | {self.skill} | {self.player1.full_name} vs {p2} [{self.status}]"


# ---------------------------------------------------------------------------
# 12. BattleSubmission
# ---------------------------------------------------------------------------

class BattleSubmission(models.Model):
    """A player's submitted answers for a BattleRoom."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    room = models.ForeignKey(
        BattleRoom,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="battle_submissions",
    )
    answers = models.JSONField(default=list)
    score = models.IntegerField()
    time_taken_seconds = models.IntegerField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "battle_submission"
        unique_together = [("room", "seeker")]
        ordering = ["submitted_at"]

    def __str__(self):
        return f"{self.seeker.full_name} -> Room {self.room.room_id} | score={self.score}"


# ---------------------------------------------------------------------------
# 13. DailyChallenge
# ---------------------------------------------------------------------------

class DailyChallenge(models.Model):
    """One MCQ challenge published per day."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    skill = models.CharField(max_length=100)
    question = models.TextField()
    # List of exactly 4 option strings
    options = models.JSONField(default=list)
    # 0-indexed correct answer (0-3)
    correct_answer = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(3)]
    )
    challenge_date = models.DateField(unique=True)

    class Meta:
        db_table = "daily_challenge"
        ordering = ["-challenge_date"]

    def __str__(self):
        return f"[{self.challenge_date}] {self.skill} — {self.question[:60]}"


# ---------------------------------------------------------------------------
# 14. Project
# ---------------------------------------------------------------------------

class Project(models.Model):
    """A portfolio project showcased by a seeker."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    tech_stack = models.JSONField(default=list)
    github_url = models.URLField(null=True, blank=True)
    live_url = models.URLField(null=True, blank=True)
    # AI-generated bullet points describing the project
    ai_bullets = models.JSONField(default=list)
    # Skills auto-extracted from description / tech_stack
    skills_extracted = models.JSONField(default=list)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project"
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        pinned = " [PINNED]" if self.is_pinned else ""
        return f"{self.title}{pinned} — {self.seeker.full_name}"


# ---------------------------------------------------------------------------
# 15. JobApplication
# ---------------------------------------------------------------------------

class JobApplication(models.Model):
    """Tracks a seeker's job application and its current status."""

    STATUS_CHOICES = [
        ("applied", "Applied"),
        ("shortlisted", "Shortlisted"),
        ("rejected", "Rejected"),
        ("hired", "Hired"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    job_title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    job_url = models.URLField(null=True, blank=True)
    cover_note = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default="applied"
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_application"
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.job_title} @ {self.company_name} [{self.status}] — {self.seeker.full_name}"


# ---------------------------------------------------------------------------
# 16. Notification
# ---------------------------------------------------------------------------

class Notification(models.Model):
    """In-app notification sent to a seeker."""

    TYPE_CHOICES = [
        ("status_updated", "Status Updated"),
        ("new_match", "New Match"),
        ("general", "General"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    seeker = models.ForeignKey(
        JobSeekerAccount,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification"
        ordering = ["-created_at"]

    def __str__(self):
        read = "READ" if self.is_read else "UNREAD"
        return f"[{read}] [{self.type}] {self.title} -> {self.seeker.full_name}"
