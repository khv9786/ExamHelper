"""
정보처리기사 기출문제 크롤러
대상: https://chobopark.tistory.com
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup, Tag
from dataclasses import dataclass, asdict
from typing import Optional

BASE_URL = "https://chobopark.tistory.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

TARGET_POSTS = {
    "exam": [558, 554, 540, 495, 483, 476, 453, 424, 423, 420, 372, 271],
    "summary": [460, 425, 274, 273],
}


@dataclass
class Question:
    post_id: int
    year: Optional[int]
    round: Optional[int]
    number: int
    question_text: str
    code_block: Optional[str]
    answer: Optional[str]
    source_type: str
    post_title: str


def fetch(url: str) -> BeautifulSoup:
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()
    return BeautifulSoup(res.text, "html.parser")


def parse_year_round(title: str) -> tuple[Optional[int], Optional[int]]:
    m = re.search(r"\[(\d{4})년\s*(\d)회\]", title)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def extract_code(code_div: Tag) -> str:
    """colorscripter-code div에서 코드 텍스트만 추출 (줄번호/워터마크 제외)"""
    # 두 번째 td (text-align:left) 가 코드 영역
    tds = code_div.select("table.colorscripter-code-table > tbody > tr > td")
    code_td = None
    for td in tds:
        style = td.get("style", "")
        if "text-align: left" in style or "text-align:left" in style:
            code_td = td
            break
    if not code_td and len(tds) >= 2:
        code_td = tds[1]

    if code_td:
        lines = [div.get_text() for div in code_td.select("div[style*='white-space']")]
        return "\n".join(lines).strip()

    return code_div.get_text("\n").strip()


def parse_post(post_id: int, source_type: str) -> list[Question]:
    url = f"{BASE_URL}/{post_id}"
    soup = fetch(url)

    # 제목
    og_title = soup.find("meta", property="og:title")
    title = og_title["content"].strip() if og_title else f"포스트 {post_id}"

    year, round_num = parse_year_round(title)

    content = soup.select_one(".tt_article_useless_p_margin.contents_style")
    if not content:
        print(f"  [경고] {post_id}: 본문 없음")
        return []

    questions = []
    # 문제 단위로 분리: <p><b>N. ...</b></p> 패턴
    # 모든 자식 요소 순회
    all_elements = list(content.descendants)

    # <b> 또는 <strong> 안에 "숫자." 로 시작하는 문제 텍스트 감지
    # 메인 문제는 bold 처리됨. non-bold 번호는 세부 항목(서브 문항)이므로 제외
    q_blocks = []  # (number, question_p_element)

    for el in content.find_all(["p", "h3", "h4"]):
        if not (el.find("b") or el.find("strong")):
            continue  # bold 텍스트 없으면 세부 항목 → 스킵
        text = el.get_text(strip=True)
        # "1. 다음..." 또는 "1.다음..." (점 뒤 공백 선택적)
        m = re.match(r"^(\d{1,2})\.\s*(.+)", text)
        if m and int(m.group(1)) <= 30:  # 문제 번호 상한
            q_blocks.append((int(m.group(1)), el, m.group(2)))

    if not q_blocks:
        print(f"  [경고] {post_id}: 문제 패턴 미감지")
        return []

    for i, (number, q_el, q_text_part) in enumerate(q_blocks):
        # 이 문제의 다음 문제 요소 또는 문서 끝까지의 형제 요소들 수집
        next_q_el = q_blocks[i + 1][1] if i + 1 < len(q_blocks) else None

        code_block = None
        answer = None
        extra_text = []

        # q_el 이후 next_q_el 이전 형제들 순회
        sibling = q_el.find_next_sibling()
        while sibling and sibling != next_q_el:
            # 코드 블록
            if "colorscripter-code" in sibling.get("class", []):
                code_block = extract_code(sibling)
            # 정답 (더보기)
            elif sibling.get("data-ke-type") == "moreLess":
                mc = sibling.select_one(".moreless-content")
                if mc:
                    answer = mc.get_text(strip=True)
            # 부가 설명 텍스트
            elif sibling.name in ("p", "ul", "ol"):
                t = sibling.get_text(strip=True)
                if t and t != " ":
                    extra_text.append(t)
            # div 내부에 colorscripter 있을 수 있음
            elif sibling.name == "div":
                inner_code = sibling.select_one(".colorscripter-code")
                if inner_code:
                    code_block = extract_code(inner_code)
                inner_more = sibling.select_one("[data-ke-type='moreLess'] .moreless-content")
                if inner_more:
                    answer = inner_more.get_text(strip=True)

            sibling = sibling.find_next_sibling()

        full_q_text = q_text_part
        if extra_text:
            full_q_text += " " + " ".join(extra_text)

        questions.append(Question(
            post_id=post_id,
            year=year,
            round=round_num,
            number=number,
            question_text=full_q_text.strip(),
            code_block=code_block,
            answer=answer,
            source_type=source_type,
            post_title=title,
        ))

    return questions


def crawl_all() -> list[dict]:
    all_questions = []
    for source_type, ids in TARGET_POSTS.items():
        for post_id in ids:
            print(f"크롤링 중: {BASE_URL}/{post_id}")
            try:
                questions = parse_post(post_id, source_type)
                print(f"  → {len(questions)}개 수집")
                all_questions.extend([asdict(q) for q in questions])
            except Exception as e:
                print(f"  [오류] {post_id}: {e}")
            time.sleep(1.5)
    return all_questions


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("=== 정보처리기사 기출문제 크롤링 시작 ===\n")
    data = crawl_all()
    print(f"\n총 {len(data)}개 문제 수집 완료")

    with open("crawler/questions.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("저장 완료: crawler/questions.json")
