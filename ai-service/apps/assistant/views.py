"""
AI Career Assistant — POST /ai/chat

Uses Gemini 1.5 Flash with a structured system prompt.
Maintains conversation context from the last 10 messages.

Rate limiting is enforced at the Node.js layer (Redis quota counter).
"""

import logging
import google.generativeai as genai
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are TrustHire AI Career Assistant — a specialized career guidance expert for Indian job seekers.

Your expertise includes:
- Resume writing and optimization for ATS systems
- Interview preparation (technical and HR rounds)
- Job search strategies on Indian job portals (Naukri, LinkedIn, Indeed India)
- Salary negotiation tips benchmarked against Indian market rates
- Career transitions and upskilling recommendations
- Understanding TrustHire platform features (Trust Score, employer verification)

Guidelines:
- Keep responses concise (under 250 words) and actionable
- Use bullet points for listicles
- Tailor advice to the Indian job market context
- If asked about a specific company's trust score, explain you can only share what's on the platform
- Always end with one follow-up question to keep the conversation helpful
- Never make up specific salary numbers — give ranges and suggest the user verify on Glassdoor/AmbitionBox

You are NOT: a customer support agent, a recruiter, or a financial advisor."""


class ChatView(APIView):
    """POST /ai/chat"""

    def post(self, request):
        message    = request.data.get('message', '').strip()
        session_id = request.data.get('sessionId', '')
        history    = request.data.get('history', [])  # [{ role, content }]

        if not message:
            return Response({'success': False, 'error': 'message is required'}, status=400)

        if not settings.GEMINI_API_KEY:
            return Response({
                'success': True,
                'data': {'reply': _offline_reply(message)},
            })

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
            )

            # Build conversation history for Gemini (last 10 turns)
            chat_history = []
            for msg in history[-10:]:
                role = 'user' if msg.get('role') == 'user' else 'model'
                chat_history.append({
                    'role':  role,
                    'parts': [msg.get('content', '')],
                })

            chat    = model.start_chat(history=chat_history)
            response = chat.send_message(message)
            reply    = response.text.strip()

        except Exception as e:
            logger.error(f'Gemini chat error: {e}')
            reply = "I'm having trouble connecting right now. Please try again in a moment."

        return Response({
            'success': True,
            'data': {'reply': reply},
        })


def _offline_reply(message: str) -> str:
    """Friendly fallback when Gemini API key is not configured."""
    return (
        "Thank you for your message! The AI career assistant is currently being configured. "
        "In the meantime, you can browse verified job listings on TrustHire and use the "
        "Trust Score feature to identify legitimate opportunities. "
        "We'll have the full AI assistant ready soon!"
    )
