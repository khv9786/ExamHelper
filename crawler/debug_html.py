import requests, sys
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

HEADERS = {"User-Agent": "Mozilla/5.0"}
res = requests.get("https://chobopark.tistory.com/476", headers=HEADERS)
soup = BeautifulSoup(res.text, "html.parser")
content = soup.select_one(".tt_article_useless_p_margin.contents_style")

# 첫 번째 colorscripter-code div 구조 확인
code_div = content.select_one(".colorscripter-code")
print("colorscripter-code HTML:")
print(str(code_div)[:3000])
