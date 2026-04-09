"""
쓰레기 데이터 제거: answer도 없고 code_block도 없고 30자 미만인 항목들
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('crawler/questions.json', encoding='utf-8') as f:
    data = json.load(f)

def is_valid(q):
    if q.get('answer'):
        return True
    if q.get('code_block'):
        return True
    if len(q['question_text']) >= 30:
        return True
    return False

clean = [q for q in data if is_valid(q)]

print(f"원본: {len(data)}개")
print(f"제거: {len(data) - len(clean)}개")
print(f"정제 후: {len(clean)}개")

with open('crawler/questions.json', 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=2)

print("저장 완료: crawler/questions.json")
