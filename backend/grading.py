"""
채점 로직.

복수정답 형식:
  - 파이프 구분: "SELECT|select"
  - JSON 배열:   '["SELECT", "select"]'
  둘 다 허용.
"""
import json
import re


def normalize(text: str) -> str:
    """소문자 변환 + 연속 공백 단일화 + 앞뒤 공백 제거."""
    text = text.strip().lower()
    text = re.sub(r'\s+', ' ', text)
    return text


def check_answer(stored_answer: str, user_answer: str) -> bool:
    """
    stored_answer: DB에 저장된 정답 문자열 (None이면 False)
    user_answer:   사용자 입력
    """
    if not stored_answer:
        return False

    user = normalize(user_answer)

    # JSON 배열 형식 시도
    try:
        options = json.loads(stored_answer)
        if isinstance(options, list):
            return user in [normalize(str(o)) for o in options]
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # 파이프 구분 형식
    if '|' in stored_answer:
        return user in [normalize(o) for o in stored_answer.split('|')]

    # 단일 정답
    return normalize(stored_answer) == user
