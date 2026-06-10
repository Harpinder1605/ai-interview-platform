from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt

from database.db import get_db
from models.user import User
from models.analytics import InterviewAnalytics
from auth.security import SECRET_KEY, ALGORITHM

router = APIRouter()

# Tell FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Dependency to securely get the current logged-in user from the JWT Token
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

class AnalyticsCreate(BaseModel):
    eye_contact_score: float
    total_frames: int

@router.post("/save")
def save_analytics(analytics: AnalyticsCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_stat = InterviewAnalytics(
        user_id=current_user.id,
        eye_contact_score=analytics.eye_contact_score,
        total_frames=analytics.total_frames
    )
    db.add(new_stat)
    db.commit()
    db.refresh(new_stat)
    return {"message": "Analytics saved successfully!", "score": new_stat.eye_contact_score}