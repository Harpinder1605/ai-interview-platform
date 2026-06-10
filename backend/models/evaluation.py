from sqlalchemy import Column, Integer, String, ForeignKey
from database.db import Base

class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question = Column(String)
    transcript = Column(String)
    score = Column(Integer)
    strengths = Column(String)
    weaknesses = Column(String)
    advice = Column(String)
    confidence_score = Column(Integer, nullable=True)