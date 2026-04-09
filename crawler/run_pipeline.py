"""
크롤링 → 문제 분리 → 쓰레기 제거 → DB 시드 파이프라인
새 문제를 추가할 때 이 스크립트 하나만 실행하면 됨
"""
import json, re, sys, subprocess
sys.stdout.reconfigure(encoding='utf-8')

# ── Step 1: 크롤링 ────────────────────────────────────────────────
print("=== 1단계: 크롤링 ===")
from crawler.crawler import crawl_all
data = crawl_all()

# ── Step 2: 문제 분리 ─────────────────────────────────────────────
print("\n=== 2단계: 혼재 문제 분리 ===")
# 패턴: "N.다음..." 이 question_text 안에 2회 이상 → 분리
NEW_Q_RE = re.compile(
    r'(?<!\()(?<!\d)\b(\d{1,2})\.\s*'
    r'(다음|아래|다음은|빈칸|괄호|보기|다음\s*각|다음\s*표|다음\s*SQL)'
)

def split_question_text(text: str):
    matches = list(NEW_Q_RE.finditer(text))
    if len(matches) <= 1:
        return []
    result = []
    for i, m in enumerate(matches):
        num = int(m.group(1))
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start + len(m.group(0)) - len(m.group(2)):end].strip()
        body = re.sub(r'^\d{1,2}\.\s*', '', body).strip()
        result.append((num, body))
    return result

new_data = []
split_count = 0
skip_keys = set()

for q in data:
    key = (q['post_id'], q['number'])
    if key in skip_keys:
        continue

    parts = split_question_text(q['question_text'])
    if not parts:
        new_data.append(q)
        continue

    split_count += 1
    first_num = parts[0][0]
    for num, body in parts:
        nq = dict(q)
        nq['number'] = num
        nq['question_text'] = body
        # 블록은 원본 문항 단위라 분리 레코드에 복제 불가
        nq['content'] = None
        nq['has_image'] = False
        if num != first_num:
            nq['answer'] = None
        new_data.append(nq)
        skip_keys.add((q['post_id'], num))

print(f"분리된 그룹: {split_count}개, 결과: {len(new_data)}개")

# ── Step 3: 쓰레기 제거 ───────────────────────────────────────────
print("\n=== 3단계: 불량 데이터 제거 ===")

def is_valid(q):
    if q.get('answer'):
        return True
    if q.get('code_block'):
        return True
    if q.get('has_image'):
        return True
    if len(q['question_text']) >= 30:
        return True
    return False

clean = [q for q in new_data if is_valid(q)]
print(f"제거: {len(new_data) - len(clean)}개 → 최종: {len(clean)}개")

# 번호 재정렬
clean.sort(key=lambda x: (x['post_id'], x['number']))

with open('crawler/questions.json', 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=2)
print("questions.json 저장 완료")

# ── Step 4: DB 시드 ───────────────────────────────────────────────
print("\n=== 4단계: DB 시드 ===")
from backend.database.seed import seed
seed()

print("\n=== 파이프라인 완료 ===")
