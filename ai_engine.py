
import logging
import os
import requests
import json
import time

logger = logging.getLogger(__name__)

# Gemini API Configuration
GEMINI_API_KEY = "AIzaSyCbOBXOM4VpGlXZKiTs9iu38xubGxx0yqk"
# Primary model (2.5 Flash)
GEMINI_25_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
# Fallback model (1.5 Flash)
GEMINI_15_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

def generate_ai_response(user_message, history=None):
    """
    Generate an AI response using Gemini API with context awareness and fallback mechanism.
    """
    context_text = ""
    try:
        from models import TrainingData
        from database import db
        from app import app
        
        with app.app_context():
            context_data = TrainingData.query.all()
            
            if not context_data:
                logger.warning("Training database is empty")
                context_text = "لا توجد بيانات تدريب متوفرة حالياً."
            else:
                context_text = "بيانات مؤسسة الحبيب الطبية المعتمدة (يجب الالتزام بها حصرياً):\n"
                for item in context_data:
                    context_text += f"سؤال: {item.question}\nإجابة: {item.answer}\n---\n"
    except Exception as e:
        logger.error(f"Error retrieving context: {str(e)}")
        context_text = "خطأ في استرجاع البيانات المدربة."

    system_instruction = f"""
    أنت مساعد ذكي وخبير لمؤسسة الحبيب للمستلزمات الطبية (Al-Habib Medical Institution).
    
    قواعد العمل الصارمة:
    1. الأولوية القصوى: استخدم البيانات المزودة في "السياق المعتمد" أدناه للإجابة على أي سؤال يتعلق بالمؤسسة أو خدماتها.
    2. الدقة والذكاء: قدم إجابات مفصلة، مهنية، ومنظمة. إذا سأل المستخدم عن منتج أو خدمة موجودة في السياق، اشرحها بوضوح.
    3. الالتزام بالسياق: إذا لم تجد المعلومة في السياق المعتمد، قل: "عذراً، هذه المعلومة غير متوفرة لدي حالياً. يرجى التواصل مع إدارة مؤسسة الحبيب للمستلزمات الطبية لمزيد من التفاصيل."
    4. ممنوع التخمين: لا تستخدم معلوماتك العامة للإجابة عن تفاصيل تخص المؤسسة (مثل الأسعار، العناوين، أو الوكالات) ما لم تكن موجودة في السياق.
    5. اللغة: تحدث بلغة عربية فصحى، مهنية، وودودة.
    6. المحادثات الطويلة: حافظ على ترابط الأفكار بناءً على تاريخ المحادثة المزود لك.
    7. الإجابات الكاملة: تأكد من إكمال إجابتك بالكامل ولا تتوقف في منتصف الجملة.

    السياق المعتمد للمؤسسة:
    {context_text}
    """

    contents = []
    if history:
        recent_history = history[-10:]
        for msg in recent_history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
    
    current_prompt = f"{system_instruction}\n\nسؤال المستخدم الحالي: {user_message}"
    contents.append({
        "role": "user",
        "parts": [{"text": current_prompt}]
    })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 2048
        }
    }
    
    headers = {"Content-Type": "application/json"}

    try:
        logger.info(f"Attempting to generate response for: {user_message[:50]}...")
        session = requests.Session()
        response = session.post(GEMINI_25_URL, headers=headers, data=json.dumps(payload), timeout=60)
        
        if response.status_code == 429:
            logger.warning("Gemini 2.5 Flash Rate Limit. Switching to Fallback (1.5 Flash)...")
            response = session.post(GEMINI_15_URL, headers=headers, data=json.dumps(payload), timeout=60)
        
        if not response.ok:
            logger.error(f"Gemini API Error ({response.status_code}): {response.text}")
            return "عذراً، واجهت مشكلة في الاتصال بمحرك الذكاء الاصطناعي. يرجى المحاولة مرة أخرى بعد قليل."
            
        result = response.json()
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                response_text = candidate['content']['parts'][0]['text'].strip()
                if candidate.get('finishReason') == 'MAX_TOKENS':
                    response_text += "\n\n(ملاحظة: تم اختصار الإجابة لطولها الزائد)."
                return response_text
        
        logger.error(f"Unexpected API response structure: {result}")
        return "عذراً، واجهت مشكلة في معالجة الرد. يرجى إعادة صياغة سؤالك."
            
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        return "عذراً، حدث خطأ غير متوقع أثناء معالجة طلبك."
