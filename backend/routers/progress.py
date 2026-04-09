from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from backend.database.db import get_db
from backend.models.models import UserProgress, Question

router = APIRouter(prefix="/progress", tags=["progress"])


class BookmarkToggle(BaseModel):
    question_id: int


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Question).count()
    solved = db.query(func.count(UserProgress.question_id.distinct())).scalar()
    correct = db.query(UserProgress).filter(UserProgress.is_correct == True).count()
    wrong = db.query(UserProgress).filter(UserProgress.is_correct == False).count()
    bookmarked = db.query(UserProgress).filter(UserProgress.is_bookmarked == True).count()
    return {
        "total_questions": total,
        "solved": solved,
        "correct": correct,
        "wrong": wrong,
        "bookmarked": bookmarked,
        "accuracy": round(correct / (correct + wrong) * 100, 1) if (correct + wrong) > 0 else 0,
    }


@router.get("/wrong-notes")
def get_wrong_notes(db: Session = Depends(get_db)):
    # 가장 최근 풀이 기준 오답 문제
    subq = (
        db.query(
            UserProgress.question_id,
            func.max(UserProgress.id).label("latest_id"),
        )
        .group_by(UserProgress.question_id)
        .subquery()
    )
    wrong = (
        db.query(UserProgress)
        .join(subq, UserProgress.id == subq.c.latest_id)
        .filter(UserProgress.is_correct == False)
        .all()
    )
    return [
        {
            "question_id": p.question_id,
            "solved_at": p.solved_at,
            "question": {
                "id": p.question.id,
                "question_text": p.question.question_text,
                "answer": p.question.answer,
                "year": p.question.year,
                "round": p.question.round,
                "post_title": p.question.post_title,
            },
        }
        for p in wrong
    ]


@router.get("/bookmarks")
def get_bookmarks(db: Session = Depends(get_db)):
    bookmarks = (
        db.query(UserProgress)
        .filter(UserProgress.is_bookmarked == True)
        .all()
    )
    seen = set()
    result = []
    for p in bookmarks:
        if p.question_id not in seen:
            seen.add(p.question_id)
            result.append({
                "question_id": p.question_id,
                "question": {
                    "id": p.question.id,
                    "question_text": p.question.question_text,
                    "answer": p.question.answer,
                    "year": p.question.year,
                    "round": p.question.round,
                },
            })
    return result


@router.post("/bookmark")
def toggle_bookmark(body: BookmarkToggle, db: Session = Depends(get_db)):
    existing = (
        db.query(UserProgress)
        .filter(UserProgress.question_id == body.question_id)
        .order_by(UserProgress.id.desc())
        .first()
    )
    if existing:
        existing.is_bookmarked = not existing.is_bookmarked
        db.commit()
        return {"bookmarked": existing.is_bookmarked}
    # 풀이 기록 없이 북마크만
    p = UserProgress(question_id=body.question_id, is_bookmarked=True)
    db.add(p)
    db.commit()
    return {"bookmarked": True}
