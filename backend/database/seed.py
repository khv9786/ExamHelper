"""
크롤링된 questions.json을 DB에 적재.

기본 동작: 업서트 (post_id + number 기준)
  - 존재하면 데이터 필드만 업데이트 (needs_review / is_verified / review_memo 보존)
  - 없으면 신규 삽입
  - 중복 실행해도 안전 (멱등)

--reset: 전체 삭제 후 재삽입 (관리 필드도 초기화됨)
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from backend.database.db import engine, SessionLocal
from backend.models.models import Base, Question

# questions.json에서 읽어오는 필드 (관리 필드 제외)
DATA_FIELDS = {
    'post_id', 'year', 'round', 'number',
    'question_text', 'code_block', 'answer',
    'source_type', 'post_title',
    'content', 'has_image',
}


def _migrate(conn):
    """기존 DB에 새 컬럼이 없으면 추가 (멱등)
    ⚠️ SQLite 전용. PostgreSQL 등으로 이전 시 PRAGMA table_info를
    SELECT column_name FROM information_schema.columns WHERE table_name='questions'
    로 교체하고 SQLAlchemy inspect()로 추상화할 것.
    """
    existing = {row[1] for row in conn.execute(
        __import__('sqlalchemy').text("PRAGMA table_info(questions)")
    )}
    if 'content' not in existing:
        conn.execute(__import__('sqlalchemy').text(
            "ALTER TABLE questions ADD COLUMN content TEXT"
        ))
        print('[migrate] content 컬럼 추가')
    if 'has_image' not in existing:
        conn.execute(__import__('sqlalchemy').text(
            "ALTER TABLE questions ADD COLUMN has_image INTEGER DEFAULT 0"
        ))
        print('[migrate] has_image 컬럼 추가')


def seed(reset: bool = False):
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        _migrate(conn)
        conn.commit()

    json_path = os.path.join(os.path.dirname(__file__), '../../crawler/questions.json')
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    db = SessionLocal()
    try:
        if reset:
            deleted = db.query(Question).count()
            db.query(Question).delete()
            db.commit()
            print(f'[reset] {deleted}개 삭제')

        inserted = updated = 0
        for item in data:
            payload = {k: v for k, v in item.items() if k in DATA_FIELDS}
            existing = (
                db.query(Question)
                .filter_by(post_id=payload['post_id'], number=payload['number'])
                .first()
            )
            if existing:
                for k, v in payload.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                db.add(Question(**payload))
                inserted += 1

        db.commit()
        print(f'완료: 신규 {inserted}개 삽입, {updated}개 업데이트')
    finally:
        db.close()


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description='questions.json → DB 적재')
    parser.add_argument('--reset', action='store_true', help='전체 삭제 후 재삽입')
    args = parser.parse_args()
    seed(reset=args.reset)
