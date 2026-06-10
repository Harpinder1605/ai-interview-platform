from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from datetime import datetime
from database.db import Base

class InterviewAnalytics(Base):
    __tablename__ = "interview_analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    eye_contact_score = Column(Float, default=0.0)
    total_frames = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)