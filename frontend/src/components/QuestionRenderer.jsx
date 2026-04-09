/**
 * 문제 텍스트를 설명 / 세부문항 / 보기로 파싱해서 렌더링
 *
 * 규칙:
 * - [보기] 마커 기준으로 앞(문제) / 뒤(보기) 분리
 * - 보기 섹션 내에서만 ㄱ. ㄴ. ㉠ ㉡ 등을 항목으로 파싱
 * - 본문 내 (①) (②) 같은 빈칸 표시는 절대 분리하지 않음
 * - 세부 문항: "숫자. 텍스트" 패턴이 2개 이상일 때만 분리
 */

const BOGI_MARKERS = ['[보기]', '< 보기 >', '<보기>']

// 보기 섹션 내 항목 시작 패턴 (라인 시작 또는 한글자모/원문자로 시작)
const BOGI_SPLIT_RE = /(?=[ㄱ-ㅎ][.\s]|[㉠-㉿][^\s]|[①-⑳][.\s])/

function parseSections(text) {
  // 1) [보기] 분리
  let mainRaw = text
  let bogiRaw = null

  for (const marker of BOGI_MARKERS) {
    const idx = text.indexOf(marker)
    if (idx !== -1) {
      mainRaw = text.slice(0, idx).trim()
      bogiRaw = text.slice(idx + marker.length).trim()
      break
    }
  }

  // 2) 보기 항목 파싱 — 보기 섹션 내에서만
  let bogiItems = []
  if (bogiRaw) {
    const trimmed = bogiRaw.trim()
    // 쉼표 구분 단어형: "ls, cd, cp, pwd"
    if (/^[a-zA-Z_\-]+(\s*,\s*[a-zA-Z_\-]+)+$/.test(trimmed)) {
      bogiItems = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      // ㄱ. ㄴ. 또는 ㉠ ㉡ 로 시작하는 항목 분리
      bogiItems = trimmed
        .split(BOGI_SPLIT_RE)
        .map(s => s.trim())
        .filter(s => s.length > 1)
    }
  }

  // 3) 세부 문항 분리
  // 패턴: 단어 경계 후 "숫자." 로 시작하는 세그먼트 (2개 이상일 때만 분리)
  const SUB_Q_SPLIT = /(?<!\()\b(\d{1,2})\.\s+(?=[가-힣A-Za-z\[<])/g
  const splitPoints = [...mainRaw.matchAll(SUB_Q_SPLIT)]

  let description = mainRaw
  const subQuestions = []

  if (splitPoints.length >= 2) {
    // 첫 번째 split 이전을 설명으로
    description = mainRaw.slice(0, splitPoints[0].index).trim()
    splitPoints.forEach((match, i) => {
      const start = match.index
      const end = splitPoints[i + 1]?.index ?? mainRaw.length
      const body = mainRaw.slice(start + match[0].length, end).trim()
      subQuestions.push({ num: match[1], text: body })
    })
  }

  return { description: description.trim(), subQuestions, bogiItems }
}

// --- 렌더 컴포넌트 ---

function DescriptionBlock({ text }) {
  if (!text) return null
  return (
    <p className="text-slate-800 leading-relaxed text-[15px] whitespace-pre-wrap">{text}</p>
  )
}

function SubQuestions({ items }) {
  if (!items.length) return null
  return (
    <div className="mt-4 space-y-2">
      {items.map(({ num, text }) => (
        <div key={num} className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <span className="shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full text-xs
                           font-bold flex items-center justify-center mt-0.5">
            {num}
          </span>
          <p className="text-slate-700 text-sm leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  )
}

function BogiSection({ items }) {
  if (!items.length) return null

  const isWordList = items.every(i => /^[a-zA-Z_\-]+$/.test(i))

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-amber-200" />
        <span className="text-xs font-bold text-amber-600 px-2 bg-amber-50
                         border border-amber-200 rounded-full py-0.5">
          보 기
        </span>
        <div className="h-px flex-1 bg-amber-200" />
      </div>

      {isWordList ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="bg-amber-50 border border-amber-300 text-amber-900
                                     text-sm font-mono font-medium px-4 py-2 rounded-lg">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100
                                    rounded-xl px-4 py-2.5 text-sm text-slate-700 leading-relaxed">
              <span className="shrink-0 text-amber-400 font-bold mt-0.5">▸</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function QuestionRenderer({ text }) {
  const { description, subQuestions, bogiItems } = parseSections(text)

  return (
    <div>
      <DescriptionBlock text={description} />
      <SubQuestions items={subQuestions} />
      <BogiSection items={bogiItems} />
    </div>
  )
}
