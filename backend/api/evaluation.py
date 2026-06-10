from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt
import os
import json
from groq import Groq
import httpx
from dotenv import load_dotenv

from database.db import get_db
from models.user import User
from models.evaluation import InterviewEvaluation
from models.analytics import InterviewAnalytics
from auth.security import SECRET_KEY, ALGORITHM

# Load environment variables from the .env file
load_dotenv()

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Securely initialize the client using the API key from the .env file
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is not set. Please add it to your .env file.")
timeout = httpx.Timeout(15.0)
client = Groq(api_key=api_key, timeout=timeout)

class EvaluationRequest(BaseModel):
    transcript: str
    question: str = "General software engineering interview"
    eye_contact_score: float = 0.0
    total_frames: int = 0

class TopicRequest(BaseModel):
    topic: str

def sanitize_input(text: str, max_length: int = 2000) -> str:
    """Remove potentially harmful characters and enforce length limits."""
    if not text or not isinstance(text, str):
        return ""
    text = text.strip()[:max_length]
    # Remove newlines that could break prompt structure
    text = text.replace('\n', ' ').replace('\r', '')
    return text

@router.post("/start")
async def start_interview(request: TopicRequest, current_user: User = Depends(get_current_user)):
    topic = sanitize_input(request.topic, 200)
    prompt = f"""
    You are an expert AI technical interviewer. 
    The candidate wants to be interviewed on the following topic:
    
    <TOPIC>{topic}</TOPIC>

    Generate an engaging, open-ended introductory interview question to start the interview.
    Return the output strictly as a JSON object with the following key:
    - "question": the generated interview question.
    """
    try:
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile', 
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs strictly in JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("Response text is None")
            
        data = json.loads(content)
        return {"question": data.get("question", f"Welcome to your mock interview on {request.topic}. Could you tell me about your experience with it?")}
    except Exception as e:
        print(f"LLM Topic Error: {e}")
        return {"question": f"Welcome to your mock interview on {request.topic}. Could you tell me about your experience with it?"}

@router.post("/analyze")
async def analyze_interview(request: EvaluationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transcript = sanitize_input(request.transcript, 5000)
    question = sanitize_input(request.question, 1000)
    
    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    prompt = f"""
    You are an expert AI technical interviewer. Evaluate the following candidate's interview response.
    
    <QUESTION>{question}</QUESTION>
    <TRANSCRIPT>{transcript}</TRANSCRIPT>
    
    Provide your evaluation strictly as a JSON object with the following keys:
    - "score": an integer from 1 to 10 evaluating the overall quality.
    - "confidence_score": an integer from 1 to 10 evaluating the candidate's confidence and assertiveness based on the transcript.
    - "strengths": a short string describing what they did well.
    - "weaknesses": a short string describing areas for improvement.
    - "advice": actionable advice for next time.
    - "next_question": a relevant follow-up question based on their answer, or a new technical question to continue the interview.
    """
    try:
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile', 
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs strictly in JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("Response text is None")
            
        evaluation_data = json.loads(content)
        
        # Fallback in case the LLM format hallucinates and forgets the next question
        if "next_question" not in evaluation_data:
            evaluation_data["next_question"] = "Thank you. Could you elaborate a bit more on your experience?"
    except Exception as e:
        print(f"LLM Evaluation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate evaluation from AI.")

    # ---------------------------------------------------------
    # Step 2: Attempt to save to the Database separately
    try:
        # Save the evaluation to the database
        new_evaluation = InterviewEvaluation(
            user_id=current_user.id,
            question=request.question,
            transcript=request.transcript,
            score=evaluation_data.get("score"),
            confidence_score=evaluation_data.get("confidence_score"),
            strengths=evaluation_data.get("strengths"),
            weaknesses=evaluation_data.get("weaknesses"),
            advice=evaluation_data.get("advice")
        )
        db.add(new_evaluation)
        
        # Save corresponding analytics simultaneously to guarantee a strict 1:1 row mapping!
        new_stat = InterviewAnalytics(
            user_id=current_user.id,
            eye_contact_score=request.eye_contact_score,
            total_frames=request.total_frames
        )
        db.add(new_stat)
        
        db.commit()
    except Exception as e:
        print(f"Database Save Error: {e}")
        db.rollback() # Rollback the session if the database throws an error
        # We deliberately don't raise a 500 error here so the user still gets their results!

    return evaluation_data

@router.get("/history")
async def get_evaluation_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Fetch evaluations for the current user, newest first
        evaluations = db.query(InterviewEvaluation).filter(InterviewEvaluation.user_id == current_user.id).order_by(InterviewEvaluation.id.desc()).all()
        
        # Fetch analytics for the current user, newest first
        analytics = db.query(InterviewAnalytics).filter(InterviewAnalytics.user_id == current_user.id).order_by(InterviewAnalytics.id.desc()).all()

        # Convert SQLAlchemy models to standard Python dictionaries so FastAPI can return them as JSON
        results = []
        for i, ev in enumerate(evaluations):
            eye_score = None
            # Pair the newest evaluation with the newest analytics
            if i < len(analytics):
                eye_score = analytics[i].eye_contact_score
                
            results.append({
                "id": ev.id,
                "question": ev.question,
                "transcript": ev.transcript,
                "score": ev.score,
                "strengths": ev.strengths,
                "weaknesses": ev.weaknesses,
                "advice": ev.advice,
                "confidence_score": getattr(ev, "confidence_score", None),
                "eye_contact_score": eye_score
            })
            
        return results
    except Exception as e:
        print(f"History Fetch Error: {e}")
        # Using HTTPException preserves CORS headers so the frontend can read the error!
        raise HTTPException(status_code=500, detail=f"Database connection or query failed: {str(e)}")