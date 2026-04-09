/**
 * 문제 렌더러
 *
 * 두 가지 모드:
 * 1. content (JSON 블록 배열) 있을 때 → 블록 순서대로 렌더링
 * 2. content 없을 때 → question_text 기반 파싱 (하위 호환)
 */

// ─── 텍스트 파싱 (하위 호환 모드용) ──────────────────────────────

const BOGI_MARKERS = ['[보기]', '< 보기 >', '<보기>']
const BOGI_SPLIT_RE = /(?=[ㄱ-ㅎ][.\s]|[㉠-㉿][^\s]|[①-⑳][.\s])/

function parseSections(text) {
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

  let bogiItems = []
  if (bogiRaw) {
    const trimmed = bogiRaw.trim()
    if (/^[a-zA-Z_\-]+(\s*,\s*[a-zA-Z_\-]+)+$/.test(trimmed)) {
      bogiItems = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      bogiItems = trimmed.split(BOGI_SPLIT_RE).map(s => s.trim()).filter(s => s.length > 1)
    }
  }

  const SUB_Q_SPLIT = /(?<!\()\b(\d{1,2})\.\s+(?=[가-힣A-Za-z\[<])/g
  const splitPoints = [...mainRaw.matchAll(SUB_Q_SPLIT)]

  let description = mainRaw
  const subQuestions = []

  if (splitPoints.length >= 2) {
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

// ─── 공통 렌더 컴포넌트 ──────────────────────────────────────────

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

// ─── 블록 렌더러 ─────────────────────────────────────────────────

function BlockText({ value }) {
  // [보기] 마커 단독 블록 → 섹션 구분선만 표시
  if (BOGI_MARKERS.some(m => value.trim() === m.trim())) {
    return (
      <div className="flex items-center gap-2 mt-5 mb-3">
        <div className="h-px flex-1 bg-amber-200" />
        <span className="text-xs font-bold text-amber-600 px-2 bg-amber-50
                         border border-amber-200 rounded-full py-0.5">
          보 기
        </span>
        <div className="h-px flex-1 bg-amber-200" />
      </div>
    )
  }

  // ㄱ. ㄴ. / ① ② 등 보기 항목 패턴 감지
  const hasBogiItems = /[ㄱ-ㅎ][.\s]|[㉠-㉿]|[①-⑳]/.test(value)
  if (hasBogiItems) {
    const items = value.split(BOGI_SPLIT_RE).map(s => s.trim()).filter(s => s.length > 1)
    if (items.length > 1) return <BogiSection items={items} />
  }

  return (
    <p className="text-slate-800 leading-relaxed text-[15px] whitespace-pre-wrap">{value}</p>
  )
}

function BlockCode({ lang, value }) {
  const label = lang || (
    value.includes('System.out') ? 'Java'
    : value.includes('def ') ? 'Python'
    : value.includes('#include') ? 'C'
    : value.includes('SELECT') || value.includes('select') ? 'SQL'
    : 'Code'
  )
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-700">
      <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-300 font-mono font-medium">{label}</span>
        <span className="text-xs text-slate-400">소스 코드</span>
      </div>
      <pre className="bg-slate-900 text-emerald-300 p-5 text-sm overflow-x-auto
                      whitespace-pre font-mono leading-relaxed">
        {value}
      </pre>
    </div>
  )
}

function BlockTable({ headers, rows }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-slate-700 border-collapse">
        {headers.length > 0 && (
          <thead className="bg-slate-100">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left font-semibold border-b border-slate-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 border-b border-slate-100">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BlockImage({ url, alt }) {
  return (
    <div className="my-4">
      <img
        src={url}
        alt={alt || '문제 이미지'}
        className="max-w-full rounded-xl border border-slate-200"
        loading="lazy"
      />
    </div>
  )
}

function renderBlock(block, i) {
  switch (block.kind) {
    case 'text':  return <BlockText  key={i} value={block.value} />
    case 'code':  return <BlockCode  key={i} lang={block.lang} value={block.value} />
    case 'table': return <BlockTable key={i} headers={block.headers} rows={block.rows} />
    case 'image': return <BlockImage key={i} url={block.url} alt={block.alt} />
    default:      return null
  }
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────

export default function QuestionRenderer({ text, content }) {
  // 블록 배열 모드 — content가 단일 진실 공급원, parseSections 호출 없음
  if (content) {
    let blocks = []
    try { blocks = JSON.parse(content) } catch { /* 파싱 실패 시 fallback */ }

    if (blocks.length > 0) {
      return (
        <div>
          {text && (
            <p className="text-slate-800 leading-relaxed text-[15px] whitespace-pre-wrap mb-2">
              {text}
            </p>
          )}
          {blocks.map((block, i) => renderBlock(block, i))}
        </div>
      )
    }
  }

  // 하위 호환 모드 (content 없음)
  const { description, subQuestions, bogiItems } = parseSections(text)
  return (
    <div>
      {description && (
        <p className="text-slate-800 leading-relaxed text-[15px] whitespace-pre-wrap">{description}</p>
      )}
      {subQuestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {subQuestions.map(({ num, text: t }) => (
            <div key={num} className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <span className="shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full text-xs
                               font-bold flex items-center justify-center mt-0.5">
                {num}
              </span>
              <p className="text-slate-700 text-sm leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      )}
      <BogiSection items={bogiItems} />
    </div>
  )
}
