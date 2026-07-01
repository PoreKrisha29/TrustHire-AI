import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
print("API Key in env:", api_key)

try:
    genai.configure(api_key=api_key)
    print("Listing models...")
    for m in genai.list_models():
        print(m.name)
except Exception as e:
    print("Error listing models:", e)
