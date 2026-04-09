from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.db import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, index=True)
    year = Column(Integer, nullable=True, index=True)
    round = Column(Integer, nullable=True, index=True)
    number = Column(Integer)
    question_text = Column(Text, nullable=False)
    code_block = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    source_type = Column(String(20), default="exam")  # exam | summary
    post_title = Column(String(200))
    content = Column(Text, nullable=True)        # 순서 보존 블록 배열 (JSON)
    has_image = Column(Boolean, default=False)   # 이미지 포함 여부
    needs_review = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    review_memo = Column(Text, nullable=True)

    progresses = relationship("UserProgress", back_populates="question")


# UserProgress는 로컬 단일 사용자 전제.
# 멀티유저 확장 시 user_id = Column(String, index=True) 추가 후
# get_db 레이어에서 사용자 식별 처리 필요.
class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    is_correct = Column(Boolean, nullable=True)
    is_bookmarked = Column(Boolean, default=False)
    solved_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("Question", back_populates="progresses")
