import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('crawler/questions.json', encoding='utf-8') as f:
    data = json.load(f)

# 문제 텍스트 내에 "숫자. 다음" 패턴이 2개 이상 → 복수 문제 혼재
multi_q_re = re.compile(r'(?<!\()\b\d{1,2}\.\s*다음')

issues = []
for q in data:
    matches = multi_q_re.findall(q['question_text'])
    if len(matches) >= 2:
        issues.append(q)

print(f"전체: {len(data)}개")
print(f"복수 문제 혼재: {len(issues)}개\n")

for q in issues[:5]:
    print(f"[ID {q['id'] if 'id' in q else '?'} | {q['post_title']} | Q{q['number']}]")
    print(f"  텍스트 앞 200자: {q['question_text'][:200]}")
    print()
