"""
채점 로직.

복수정답 형식:
  - 파이프 구분: "SELECT|select"
  - JSON 배열:   '["SELECT", "select"]'
  - 번호형:      "1. redo2. undo" → numbered
  - 쉼표/줄바꿈: "가상회선, 데이터그램" → list (순서 무관)
"""
import json
import re

# 번호형 패턴: "1." "2." ... 기준 분리
_NUMBERED_SPLIT_RE = re.compile(r'(\d+)\.')

# 원문자 라벨 (① ② ... ⑳)
_CIRCLE_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"


def normalize(text: str) -> str:
    """소문자 변환 + 연속 공백 단일화 + 앞뒤 공백 제거."""
    text = text.strip().lower()
    text = re.sub(r'\s+', ' ', text)
    return text


def detect_answer_format(answer: str) -> dict:
    """
    DB 정답 문자열 → 입력 포맷 정보 반환 (실시간 파싱, DB 저장 없음)

    반환:
      type   : "single" | "numbered" | "list"
      count  : 파트 수
      labels : ["①","②",...] (numbered) 또는 [] (나머지)
      parts  : 정답 파트 배열
    """
    if not answer:
        return {"type": "single", "count": 1, "labels": [], "parts": [""]}

    answer = answer.strip()

    # 번호형 감지: "1. X2. Y" 또는 "1. X\n2. Y"
    tokens = _NUMBERED_SPLIT_RE.split(answer)
    # tokens: ["", "1", " redo", "2", " undo"] 또는 ["앞텍스트", "1", ...]
    nums = tokens[1::2]
    contents = [t.strip() for t in tokens[2::2]]
    if (
        len(nums) >= 2
        and all(n.isdigit() for n in nums)
        and [int(n) for n in nums] == list(range(1, len(nums) + 1))  # 1,2,3... 연속
    ):
        labels = [_CIRCLE_NUMS[i] if i < len(_CIRCLE_NUMS) else str(i + 1)
                  for i in range(len(contents))]
        return {"type": "numbered", "count": len(contents), "labels": labels, "parts": contents}

    # 리스트형 감지: 쉼표 또는 줄바꿈 구분, 2개 이상
    if ',' in answer or '\n' in answer:
        parts = [p.strip() for p in re.split(r'[,\n]+', answer) if p.strip()]
        if len(parts) >= 2:
            return {"type": "list", "count": len(parts), "labels": [], "parts": parts}

    return {"type": "single", "count": 1, "labels": [], "parts": [answer]}


def check_answer(stored_answer: str, user_answer: str) -> bool:
    """단일 문자열 채점 (하위 호환 유지)."""
    if not stored_answer:
        return False

    user = normalize(user_answer)

    # JSON 배열 형식
    try:
        options = json.loads(stored_answer)
        if isinstance(options, list):
            return user in [normalize(str(o)) for o in options]
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # 파이프 구분 형식
    if '|' in stored_answer:
        return user in [normalize(o) for o in stored_answer.split('|')]

    return normalize(stored_answer) == user


def check_answer_parts(stored_answer: str, user_parts: list[str]) -> list[bool]:
    """
    복수 파트 채점.
    - numbered: 순서 고정, 파트별 비교
    - list:     순서 무관, set 비교
    - single:   첫 파트만 check_answer로 위임
    반환: 파트별 bool 리스트
    """
    if not stored_answer:
        return [False] * len(user_parts)

    fmt = detect_answer_format(stored_answer)

    if fmt["type"] == "single":
        combined = " ".join(p.strip() for p in user_parts)
        return [check_answer(stored_answer, combined)]

    stored_parts = fmt["parts"]

    if fmt["type"] == "numbered":
        results = []
        for i, up in enumerate(user_parts):
            if i < len(stored_parts):
                results.append(normalize(up) == normalize(stored_parts[i]))
            else:
                results.append(False)
        return results

    if fmt["type"] == "list":
        normalized_stored = {normalize(p) for p in stored_parts}
        return [normalize(up) in normalized_stored for up in user_parts]

    return [False] * len(user_parts)
