"""
복수 문제가 혼재된 question_text를 개별 문제로 분리
패턴: "N. 다음..." 또는 "N.아래..." 가 본문 중간에 등장
"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

# 새 문제 시작 감지 패턴 (문장 중간에 숫자. 으로 새 문제 시작)
NEW_Q_RE = re.compile(r'(?<!\()(?<!\d)\b(\d{1,2})\.\s*(다음|아래|다음은|빈칸|괄호|보기|다음\s*각|다음\s*표|다음\s*SQL)')

def split_question_text(text: str) -> list[tuple[int, str]]:
    """text에서 문제 번호와 내용 쌍 목록 반환"""
    matches = list(NEW_Q_RE.finditer(text))
    if len(matches) <= 1:
        return []  # 분리 불필요

    result = []
    for i, m in enumerate(matches):
        num = int(m.group(1))
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start + len(m.group(0)) - len(m.group(2)):end].strip()
        # 번호 제거 후 본문만
        body = re.sub(r'^\d{1,2}\.\s*', '', body).strip()
        result.append((num, body))
    return result


with open('crawler/questions.json', encoding='utf-8') as f:
    data = json.load(f)

new_data = []
split_count = 0
skip_numbers = set()  # 이미 처리된 (post_id, number) 쌍

for q in data:
    key = (q['post_id'], q['number'])
    if key in skip_numbers:
        continue

    parts = split_question_text(q['question_text'])

    if not parts:
        new_data.append(q)
        continue

    split_count += 1
    first_num = parts[0][0]

    for num, body in parts:
        new_q = dict(q)
        new_q['number'] = num
        new_q['question_text'] = body
        # 정답은 원본 번호와 일치하는 파트에만
        if num != first_num:
            new_q['answer'] = None
        new_data.append(new_q)
        skip_numbers.add((q['post_id'], num))

print(f"원본: {len(data)}개")
print(f"분리된 문제 그룹: {split_count}개")
print(f"정제 후: {len(new_data)}개")

# 번호 재정렬 (post_id, number 기준)
new_data.sort(key=lambda x: (x['post_id'], x['number']))

with open('crawler/questions.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print("저장 완료: crawler/questions.json")
