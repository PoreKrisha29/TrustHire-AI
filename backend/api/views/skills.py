"""
api/views/skills.py

Skill Genome endpoints.

GET  /api/v1/skills/         → list seeker's UserSkill objects grouped by domain
POST /api/v1/skills/mark-known → toggle is_self_marked, create if not exists
GET  /api/v1/skills/catalog  → comprehensive hardcoded skill catalog by domain
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, UserSkill


# ---------------------------------------------------------------------------
# Comprehensive skill catalog
# ---------------------------------------------------------------------------

SKILL_CATALOG = {
    "Web Frontend": [
        "HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Vue.js", "Angular",
        "Next.js", "Nuxt.js", "Svelte", "Tailwind CSS", "SASS/SCSS", "Bootstrap",
        "Redux", "Zustand", "React Query", "GraphQL (Client)", "Webpack", "Vite",
        "Web Accessibility (WCAG)", "Responsive Design", "CSS Grid", "Flexbox",
        "Web Performance", "PWA", "WebSockets (Client)",
    ],
    "Backend": [
        "Python", "Django", "FastAPI", "Flask", "Node.js", "Express.js", "NestJS",
        "Java", "Spring Boot", "Go", "Gin", "Rust", "Actix", "PHP", "Laravel",
        "Ruby on Rails", "C#", ".NET Core", "GraphQL (Server)", "REST API Design",
        "gRPC", "WebSockets (Server)", "Celery", "Message Queues", "OAuth2 / JWT",
        "Rate Limiting", "Caching Strategies",
    ],
    "DevOps": [
        "Docker", "Kubernetes", "Helm", "CI/CD", "GitHub Actions", "Jenkins",
        "GitLab CI", "Terraform", "Ansible", "AWS", "GCP", "Azure", "Linux",
        "Bash Scripting", "Nginx", "Apache", "Load Balancing", "Monitoring (Prometheus)",
        "Grafana", "ELK Stack", "Logging", "Infrastructure as Code", "Service Mesh",
        "Istio", "ArgoCD",
    ],
    "Databases": [
        "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra",
        "Elasticsearch", "DynamoDB", "Supabase", "Firebase Firestore", "Prisma ORM",
        "SQLAlchemy", "Query Optimisation", "Database Indexing", "Transactions",
        "Replication", "Sharding", "Time-Series DB", "ClickHouse", "Neo4j",
    ],
    "Mobile": [
        "React Native", "Flutter", "Swift", "SwiftUI", "Kotlin", "Jetpack Compose",
        "Expo", "iOS Development", "Android Development", "Mobile UI Design",
        "App Store Deployment", "Push Notifications", "Offline-first", "SQLite (Mobile)",
        "Capacitor", "Ionic",
    ],
    "Data / ML": [
        "Python (Data)", "Pandas", "NumPy", "Matplotlib", "Seaborn",
        "Scikit-learn", "TensorFlow", "PyTorch", "Keras", "Hugging Face",
        "LangChain", "OpenAI API", "Gemini API", "NLP", "Computer Vision",
        "Feature Engineering", "Model Evaluation", "SQL for Analytics",
        "Apache Spark", "Airflow", "dbt", "Data Warehousing", "Tableau", "Power BI",
        "A/B Testing", "Statistics",
    ],
    "Tools": [
        "Git", "GitHub", "GitLab", "Jira", "Confluence", "Notion", "Figma",
        "Postman", "VS Code", "IntelliJ IDEA", "Vim", "Linux CLI", "tmux",
        "Agile / Scrum", "System Design", "Data Structures & Algorithms",
        "Code Review", "Technical Writing", "API Documentation", "OpenAPI / Swagger",
    ],
}


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def get_seeker(request) -> "JobSeekerAccount | None":
    token_user_id = request.auth.get("user_id") if request.auth else None
    if not token_user_id:
        return None
    try:
        return JobSeekerAccount.objects.get(id=token_user_id, is_active=True)
    except JobSeekerAccount.DoesNotExist:
        return None


def auth_error():
    return Response(
        {"success": False, "message": "Authentication required."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/skills/catalog
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def skill_catalog(request):
    """Return the hardcoded skill catalog grouped by domain."""
    return Response({"success": True, "data": SKILL_CATALOG})


# ---------------------------------------------------------------------------
# GET /api/v1/skills/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_skills(request):
    """
    Return the seeker's UserSkill objects grouped by domain.

    Response shape:
    {
      "success": true,
      "data": {
        "Web Frontend": [
          {
            "id": "...",
            "skill_name": "React",
            "domain": "Web Frontend",
            "is_certified": true,
            "is_self_marked": false,
            "xp_contribution": 200
          },
          ...
        ],
        ...
      }
    }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    skills = UserSkill.objects.filter(seeker=seeker).order_by("domain", "skill_name")
    grouped: dict[str, list] = {}
    for sk in skills:
        domain = sk.domain or "Uncategorised"
        grouped.setdefault(domain, []).append(
            {
                "id":              str(sk.id),
                "skill_name":      sk.skill_name,
                "domain":          sk.domain,
                "is_certified":    sk.is_certified,
                "is_self_marked":  sk.is_self_marked,
                "xp_contribution": sk.xp_contribution,
            }
        )
    return Response({"success": True, "data": grouped})


# ---------------------------------------------------------------------------
# POST /api/v1/skills/mark-known
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_skill_known(request):
    """
    Toggle is_self_marked on a UserSkill.
    Creates the UserSkill record if it doesn't exist yet.

    Body: { "skill_name": "React", "domain": "Web Frontend" }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    skill_name = request.data.get("skill_name", "").strip()
    domain     = request.data.get("domain", "").strip() or None

    if not skill_name:
        return Response(
            {"success": False, "message": "'skill_name' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    skill, _created = UserSkill.objects.get_or_create(
        seeker=seeker,
        skill_name=skill_name,
        defaults={"domain": domain, "is_self_marked": True},
    )

    if not _created:
        # Toggle
        skill.is_self_marked = not skill.is_self_marked
        if domain and not skill.domain:
            skill.domain = domain
        skill.save(update_fields=["is_self_marked", "domain"])

    return Response(
        {
            "success": True,
            "data": {
                "skill_name":      skill.skill_name,
                "domain":          skill.domain,
                "is_self_marked":  skill.is_self_marked,
                "is_certified":    skill.is_certified,
                "xp_contribution": skill.xp_contribution,
            },
        }
    )
