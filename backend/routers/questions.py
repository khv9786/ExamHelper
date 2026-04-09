from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database.db import get_db
from backend.grading import check_answer, check_answer_parts, detect_answer_format
from backend.models.models import Question, UserProgress

router = APIRouter(prefix="/questions", tags=["questions"])


# --- 응답 스키마 ---

class AnswerFormat(BaseModel):
    type: str           # single | numbered | list
    count: int
    labels: list[str]   # numbered일 때 ["①","②",...]


class QuestionOut(BaseModel):
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
    content: Optional[str] = None
    has_image: bool = False
    answer_format: Optional[AnswerFormat] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_question(cls, q: Question) -> "QuestionOut":
        obj = cls.model_validate(q)
        if q.answer:
            fmt = detect_answer_format(q.answer)
            obj.answer_format = AnswerFormat(
                type=fmt["type"],
                count=fmt["count"],
                labels=fmt["labels"],
            )
        return obj


class AnswerSubmit(BaseModel):
    user_answer: str = ""
    user_parts: Optional[list[str]] = None   # 복수 파트 입력


class AnswerResult(BaseModel):
    correct: bool
    correct_answer: Optional[str]
    part_results: Optional[list[bool]] = None   # 파트별 O/X


# --- 엔드포인트 ---

@router.get("/", response_model=list[QuestionOut])
def list_questions(
    year: Optional[int] = None,
    round: Optional[int] = None,
    source_type: Optional[str] = None,
    mode: Optional[str] = Query(None, description="random"),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Question)
    if year:
        q = q.filter(Question.year == year)
    if round:
        q = q.filter(Question.round == round)
    if source_type:
        q = q.filter(Question.source_type == source_type)
    if mode == "random":
        q = q.order_by(func.random())

    return [QuestionOut.from_question(row) for row in q.limit(limit).all()]


@router.get("/years")
def get_years(db: Session = Depends(get_db)):
    rows = db.query(Question.year, Question.round).distinct().order_by(
        Question.year.desc(), Question.round
    ).all()
    result = {}
    for year, round_ in rows:
        if year is None:
            continue
        result.setdefault(year, [])
        if round_ and round_ not in result[year]:
            result[year].append(round_)
    return result


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    return QuestionOut.from_question(q)


@router.post("/{question_id}/report")
def report_question(question_id: int, db: Session = Depends(get_db)):
    exists = db.query(Question.id).filter(Question.id == question_id).first()
    if not exists:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    db.query(Question).filter(Question.id == question_id).update({"needs_review": True})
    db.commit()
    return {"needs_review": True}


@router.post("/{question_id}/answer", response_model=AnswerResult)
def submit_answer(
    question_id: int,
    body: AnswerSubmit,
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    if body.user_parts is not None:
        # 복수 파트 채점
        part_results = check_answer_parts(q.answer, body.user_parts)
        correct = all(part_results)
    else:
        # 단일 문자열 채점 (하위 호환)
        part_results = None
        correct = check_answer(q.answer, body.user_answer)

    progress = UserProgress(question_id=question_id, is_correct=correct)
    db.add(progress)
    db.commit()

    return AnswerResult(correct=correct, correct_answer=q.answer, part_results=part_results)
