from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database.db import get_db
from backend.models.models import Question

router = APIRouter(prefix="/admin", tags=["admin"])


class QuestionAdminOut(BaseModel):
    id: int
    post_id: int
    year: Optional[int]
    round: Optional[int]
    number: int
    question_text: str
    code_block: Optional[str]
    answer: Optional[str]
    source_type: str
    post_title: str
    needs_review: bool
    is_verified: bool
    review_memo: Optional[str]

    class Config:
        from_attributes = True


class QuestionPatch(BaseModel):
    question_text: Optional[str] = None
    code_block: Optional[str] = None
    answer: Optional[str] = None
    review_memo: Optional[str] = None
    is_verified: Optional[bool] = None
    needs_review: Optional[bool] = None


@router.get("/questions", response_model=list[QuestionAdminOut])
def list_admin_questions(
    filter: Optional[str] = None,  # "needs_review" | "unverified" | None(전체)
    db: Session = Depends(get_db),
):
    q = db.query(Question)
    if filter == "needs_review":
        q = q.filter(Question.needs_review == 1)
    elif filter == "unverified":
        q = q.filter(Question.is_verified == 0)
    return q.order_by(Question.year, Question.round, Question.number).all()


@router.patch("/questions/{question_id}", response_model=QuestionAdminOut)
def patch_question(
    question_id: int,
    body: QuestionPatch,
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    updates = body.model_dump(exclude_unset=True)
    db.query(Question).filter(Question.id == question_id).update(updates)
    db.commit()
    db.refresh(q)
    return q
