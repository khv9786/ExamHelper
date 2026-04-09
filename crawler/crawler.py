"""
정보처리기사 기출문제 크롤러
대상: https://chobopark.tistory.com
"""

import re
import json
import time
import os
import requests
from bs4 import BeautifulSoup, Tag
from dataclasses import dataclass, field, asdict
from typing import Optional
from urllib.parse import urlparse, parse_qs

BASE_URL = "https://chobopark.tistory.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# 이미지 저장 경로: backend/static/images/
_CRAWLER_DIR = os.path.dirname(__file__)
IMAGE_DIR = os.path.normpath(os.path.join(_CRAWLER_DIR, "../backend/static/images"))
os.makedirs(IMAGE_DIR, exist_ok=True)

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
    content: Optional[str] = None   # JSON 블록 배열
    has_image: bool = False


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


def resolve_image_url(url: str) -> str:
    """티스토리 CDN 리사이즈 URL에서 원본 URL 추출"""
    # ?fname=https://... 형태
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    if "fname" in qs:
        return qs["fname"][0]
    return url


def download_image(url: str, post_id: int, q_number: int, idx: int) -> Optional[str]:
    """
    이미지를 로컬에 다운로드하고 정적 서빙 경로를 반환.
    실패 시 None 반환 (원본 URL 유지).
    파일명: {post_id}_{q_number}_{idx}.{ext}
    """
    try:
        parsed = urlparse(url)
        ext = os.path.splitext(parsed.path)[-1].lower() or ".png"
        if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
            ext = ".png"

        filename = f"{post_id}_{q_number}_{idx}{ext}"
        filepath = os.path.join(IMAGE_DIR, filename)

        # 이미 다운로드된 파일이면 재사용
        if os.path.exists(filepath):
            return f"/static/images/{filename}"

        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(resp.content)

        return f"/static/images/{filename}"
    except Exception as e:
        print(f"    [이미지 다운로드 실패] {url[:60]}... → {e}")
        return None


def parse_table(table_tag: Tag) -> dict:
    """<table> 태그를 {kind, headers, rows} 블록으로 변환"""
    headers = []
    rows = []

    thead = table_tag.find("thead")
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all(["th", "td"])]

    tbody = table_tag.find("tbody") or table_tag
    for tr in tbody.find_all("tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
        if cells:
            rows.append(cells)

    # thead가 없고 첫 행이 th로만 구성된 경우
    if not headers and rows and table_tag.find("th"):
        first_tr = table_tag.find("tr")
        if first_tr and all(cell.name == "th" for cell in first_tr.find_all(["td", "th"])):
            headers = rows.pop(0)

    return {"kind": "table", "headers": headers, "rows": rows}


def extract_images_from_tag(tag: Tag) -> list[dict]:
    """
    태그 내 이미지 블록 추출.
    우선순위:
      1. figure.imageblock > span[data-phocus]  (티스토리 만료 없는 영구 URL)
      2. figure.imageblock > span[data-url]
      3. <img src> / <img data-src>
    """
    blocks = []
    seen_urls = set()

    # 1) Tistory imageblock figure
    for fig in tag.find_all("figure", class_="imageblock"):
        span = fig.find("span", attrs={"data-phocus": True}) or \
               fig.find("span", attrs={"data-url": True})
        url = ""
        if span:
            url = span.get("data-phocus") or span.get("data-url") or ""
        if not url:
            img = fig.find("img")
            if img:
                url = img.get("src") or img.get("data-src") or ""
        url = resolve_image_url(url) if url else ""
        if url and url not in seen_urls:
            seen_urls.add(url)
            alt = (fig.find("img") or {}).get("alt", "") if fig.find("img") else ""
            blocks.append({"kind": "image", "url": url, "alt": alt.strip()})

    # 2) imageblock 외 일반 <img>
    for img in tag.find_all("img"):
        if img.find_parent("figure", class_="imageblock"):
            continue  # 위에서 처리됨
        src = img.get("src") or img.get("data-src") or ""
        if not src:
            continue
        url = resolve_image_url(src)
        if url and url not in seen_urls:
            seen_urls.add(url)
            blocks.append({"kind": "image", "url": url, "alt": img.get("alt", "").strip()})

    return blocks


def to_blocks(siblings: list[Tag]) -> list[dict]:
    """
    문항 범위 내 형제 노드들을 순서 보존 블록 배열로 변환.
    answer(moreLess) 영역은 건너뜀.
    """
    blocks = []

    for el in siblings:
        if not isinstance(el, Tag):
            continue

        # 정답 영역 스킵 (decompose 없이 건너뜀으로 원본 DOM 보존)
        if el.get("data-ke-type") == "moreLess":
            continue
        if el.find(attrs={"data-ke-type": "moreLess"}) and not el.find(
            lambda t: t.name and t.get("data-ke-type") != "moreLess"
                and t.get_text(strip=True)
        ):
            continue  # moreLess만 있는 div → 전체 스킵

        # 코드 블록
        code_div = None
        if "colorscripter-code" in el.get("class", []):
            code_div = el
        elif el.name == "div":
            code_div = el.select_one(".colorscripter-code")

        if code_div:
            value = extract_code(code_div)
            if value:
                # 언어 추측: colorscripter-ko-[lang] 클래스
                lang = ""
                cls_str = " ".join(code_div.get("class", []))
                m = re.search(r"colorscripter-ko-(\w+)", cls_str)
                if m:
                    lang = m.group(1)
                blocks.append({"kind": "code", "lang": lang, "value": value})
            continue

        # figure.imageblock 직접 처리 (p 태그 없이 단독으로 오는 경우)
        if el.name == "figure" and "imageblock" in el.get("class", []):
            img_blocks = extract_images_from_tag(el)
            blocks.extend(img_blocks)
            continue

        # 표: <figure><table> 또는 <thead>/<th> 구조가 있는 bare <table>만 허용
        # (블로그 위젯/네비게이션 bare <table>은 제외)
        table_tag = None
        if el.name == "figure":
            table_tag = el.find("table")
        elif el.name == "table" and (el.find("thead") or el.find("th")):
            table_tag = el

        if table_tag:
            blocks.append(parse_table(table_tag))
            continue

        # 이미지가 포함된 요소
        img_blocks = extract_images_from_tag(el)
        if img_blocks:
            # <img>는 텍스트 노드가 없으므로 get_text()는 이미지 제외한 텍스트만 반환
            remaining = el.get_text(strip=True)
            if remaining:
                blocks.append({"kind": "text", "value": remaining})
            blocks.extend(img_blocks)
            continue

        # 텍스트 블록 (<p>, <ul>, <ol> 등)
        if el.name in ("p", "ul", "ol", "div"):
            text = el.get_text(strip=True)
            if text and text != "\xa0":
                blocks.append({"kind": "text", "value": text})

    return blocks


def parse_post(post_id: int, source_type: str) -> list[Question]:
    url = f"{BASE_URL}/{post_id}"
    soup = fetch(url)

    og_title = soup.find("meta", property="og:title")
    title = og_title["content"].strip() if og_title else f"포스트 {post_id}"

    year, round_num = parse_year_round(title)

    content = soup.select_one(".tt_article_useless_p_margin.contents_style")
    if not content:
        print(f"  [경고] {post_id}: 본문 없음")
        return []

    # 문항 경계 감지
    q_blocks = []
    for el in content.find_all(["p", "h3", "h4"]):
        if not (el.find("b") or el.find("strong")):
            continue
        text = el.get_text(strip=True)
        m = re.match(r"^(\d{1,2})\.\s*(.+)", text)
        if m and int(m.group(1)) <= 30:
            q_blocks.append((int(m.group(1)), el, m.group(2)))

    if not q_blocks:
        print(f"  [경고] {post_id}: 문제 패턴 미감지")
        return []

    questions = []
    for i, (number, q_el, q_text_part) in enumerate(q_blocks):
        next_q_el = q_blocks[i + 1][1] if i + 1 < len(q_blocks) else None

        # 이 문항의 형제 요소 수집
        siblings = []
        sibling = q_el.find_next_sibling()
        while sibling and sibling != next_q_el:
            siblings.append(sibling)
            sibling = sibling.find_next_sibling()

        # question_text = 문항 번호 줄 텍스트만 (Option A: 나머지는 content 블록에만 존재)
        code_block = None
        answer = None

        for sib in siblings:
            if not isinstance(sib, Tag):
                continue
            if "colorscripter-code" in sib.get("class", []):
                if code_block is None:
                    code_block = extract_code(sib)
            elif sib.get("data-ke-type") == "moreLess":
                mc = sib.select_one(".moreless-content")
                if mc:
                    answer = mc.get_text(strip=True)
            elif sib.name == "div":
                inner_code = sib.select_one(".colorscripter-code")
                if inner_code and code_block is None:
                    code_block = extract_code(inner_code)
                inner_more = sib.select_one("[data-ke-type='moreLess'] .moreless-content")
                if inner_more and answer is None:
                    answer = inner_more.get_text(strip=True)

        # 콘텐츠 블록 배열 생성
        blocks = to_blocks(siblings)

        # 이미지 블록 로컬 다운로드 (CDN URL → /static/images/...)
        img_idx = 0
        for block in blocks:
            if block["kind"] == "image":
                local_path = download_image(block["url"], post_id, number, img_idx)
                if local_path:
                    block["url"] = local_path
                img_idx += 1

        has_image = any(b["kind"] == "image" for b in blocks)
        content_json = json.dumps(blocks, ensure_ascii=False) if blocks else None

        questions.append(Question(
            post_id=post_id,
            year=year,
            round=round_num,
            number=number,
            question_text=q_text_part.strip(),
            code_block=code_block,
            answer=answer,
            source_type=source_type,
            post_title=title,
            content=content_json,
            has_image=has_image,
        ))

    return questions


def crawl_all() -> list[dict]:
    all_questions = []
    for source_type, ids in TARGET_POSTS.items():
        for post_id in ids:
            print(f"크롤링 중: {BASE_URL}/{post_id}")
            try:
                questions = parse_post(post_id, source_type)
                img_count = sum(1 for q in questions if q.has_image)
                print(f"  → {len(questions)}개 수집 (이미지 포함: {img_count}개)")
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
    img_total = sum(1 for q in data if q.get("has_image"))
    print(f"이미지 포함 문제: {img_total}개")

    with open("crawler/questions.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("저장 완료: crawler/questions.json")
