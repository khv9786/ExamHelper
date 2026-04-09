import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getQuestions, submitAnswer, toggleBookmark, reportQuestion } from '../api'
import QuestionRenderer from '../components/QuestionRenderer'

function CodeBlock({ code }) {
  const lang = code.includes('class ') && code.includes('{')
    ? (code.includes('System.out') ? 'Java' : code.includes('cout') ? 'C++' : 'C/Java')
    : code.includes('def ') ? 'Python' : 'Code'

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-700">
      <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-300 font-mono font-medium">{lang}</span>
        <span className="text-xs text-slate-400">소스 코드</span>
      </div>
      <pre className="bg-slate-900 text-emerald-300 p-5 text-sm overflow-x-auto whitespace-pre font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100)
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{current + 1} / {total} 문제</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// 답안 입력 컴포넌트
function AnswerInput({ format, parts, onChange, onSubmit }) {
  const isSingle = !format || format.type === 'single'

  if (isSingle) {
    return (
      <textarea
        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm resize-none
                   focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                   transition-all placeholder-slate-300 leading-relaxed"
        rows={4}
        placeholder="답을 입력하세요..."
        value={parts[0] || ''}
        onChange={e => onChange([e.target.value])}
        onKeyDown={e => e.key === 'Enter' && e.ctrlKey && onSubmit()}
        autoFocus
      />
    )
  }

  const isOrdered = format.type === 'numbered'
  return (
    <div className="space-y-2">
      {!isOrdered && (
        <p className="text-xs text-slate-400">순서 무관하게 입력하세요</p>
      )}
      {Array.from({ length: format.count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          {isOrdered && (
            <span className="shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full text-sm
                             font-bold flex items-center justify-center">
              {format.labels[i] || i + 1}
            </span>
          )}
          <input
            type="text"
            className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm
                       focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                       transition-all placeholder-slate-300"
            placeholder={`${isOrdered ? format.labels[i] || `${i+1}번` : `항목 ${i+1}`} 입력`}
            value={parts[i] || ''}
            onChange={e => {
              const next = [...parts]
              next[i] = e.target.value
              onChange(next)
            }}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && onSubmit()}
            autoFocus={i === 0}
          />
        </div>
      ))}
    </div>
  )
}

// 파트별 결과 표시
function PartResults({ format, parts, partResults, correctAnswer }) {
  if (!partResults || format?.type === 'single') return null
  const isOrdered = format?.type === 'numbered'
  return (
    <div className="space-y-1.5 mt-3">
      {partResults.map((ok, i) => (
        <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg
          ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {isOrdered && (
            <span className="font-bold w-5 text-center">
              {format.labels[i] || i + 1}
            </span>
          )}
          <span className="flex-1">{parts[i] || '(미입력)'}</span>
          <span>{ok ? '✓' : '✗'}</span>
        </div>
      ))}
    </div>
  )
}

function QuestionCard({ question, onNext, onSkip, total, current }) {
  const fmt = question.answer_format || null
  const initParts = () => Array.from({ length: fmt?.count || 1 }, () => '')

  const [parts, setParts] = useState(initParts)
  const [result, setResult] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reported, setReported] = useState(false)

  const isSingle = !fmt || fmt.type === 'single'

  const handleSubmit = async () => {
    const hasInput = parts.some(p => p.trim())
    if (!hasInput || submitting) return
    setSubmitting(true)
    const res = isSingle
      ? await submitAnswer(question.id, parts[0])
      : await submitAnswer(question.id, '', parts)
    setResult(res)
    setSubmitting(false)
  }

  const handleBookmark = async () => {
    const res = await toggleBookmark(question.id)
    setBookmarked(res.bookmarked)
  }

  const handleNext = () => {
    setParts(initParts())
    setResult(null)
    setShowAnswer(false)
    setReported(false)
    onNext()
  }

  const handleReport = async () => {
    const res = await reportQuestion(question.id)
    setReported(res.needs_review)
  }

  return (
    <div className="space-y-4">
      <ProgressBar current={current} total={total} />

      {/* 메타 정보 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Q{question.number}
          </span>
          {question.year && (
            <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
              {question.year}년 {question.round}회
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full border transition-colors ${
              bookmarked
                ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                : 'border-slate-200 text-slate-400 hover:border-yellow-300'
            }`}
          >
            {bookmarked ? '★ 북마크됨' : '☆ 북마크'}
          </button>
          <button
            onClick={handleReport}
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full border transition-colors ${
              reported
                ? 'border-red-400 bg-red-50 text-red-600'
                : 'border-slate-200 text-slate-400 hover:border-red-300'
            }`}
          >
            {reported ? '! 신고됨' : '! 오류 신고'}
          </button>
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">문제</span>
        </div>
        <div className="p-5">
          <QuestionRenderer text={question.question_text} content={question.content} />
          {!question.content && question.code_block && <CodeBlock code={question.code_block} />}
        </div>
      </div>

      {/* 답안 영역 */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-sm font-semibold text-slate-600">답안 작성</span>
          {!result && (
            <span className="ml-auto text-xs text-slate-400">Ctrl + Enter 로 제출</span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              <AnswerInput
                format={fmt}
                parts={parts}
                onChange={setParts}
                onSubmit={handleSubmit}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!parts.some(p => p.trim()) || submitting}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold
                             hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors text-sm"
                >
                  {submitting ? '채점 중...' : '제출하기'}
                </button>
                <button
                  onClick={() => setShowAnswer(v => !v)}
                  className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl text-sm
                             font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {showAnswer ? '정답 숨기기' : '정답 보기'}
                </button>
                <button
                  onClick={onSkip}
                  className="px-5 py-3 border-2 border-slate-200 text-slate-400 rounded-xl text-sm
                             font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  title="답 입력 없이 다음 문제로"
                >
                  건너뛰기
                </button>
              </div>

              {showAnswer && question.answer && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-500 mb-1 uppercase tracking-wide">정답</div>
                  <div className="text-blue-900 font-medium whitespace-pre-wrap">{question.answer}</div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 결과 피드백 */}
              <div className={`rounded-xl p-5 border-2 ${
                result.correct
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className={`flex items-center gap-3 mb-3 ${
                  result.correct ? 'text-green-700' : 'text-red-700'
                }`}>
                  <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
                  <span className="text-lg font-bold">
                    {result.correct ? '정답입니다!' : '오답입니다'}
                  </span>
                </div>

                {/* 파트별 결과 */}
                {result.part_results ? (
                  <PartResults
                    format={fmt}
                    parts={parts}
                    partResults={result.part_results}
                    correctAnswer={result.correct_answer}
                  />
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-16 shrink-0">내 답변</span>
                      <span className={`font-medium ${result.correct ? 'text-green-800' : 'text-red-800'}`}>
                        {parts[0]}
                      </span>
                    </div>
                  </div>
                )}

                {!result.correct && result.correct_answer && (
                  <div className={`flex gap-2 pt-3 mt-3 border-t ${
                    result.part_results ? 'border-slate-200' : 'border-red-200'
                  }`}>
                    <span className="text-slate-500 text-sm w-16 shrink-0">정답</span>
                    <span className="font-bold text-green-700 text-sm whitespace-pre-wrap">
                      {result.correct_answer}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                           hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                다음 문제
                <span>→</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const SESSION_KEY = 'exam_session'

export default function Exam() {
  const [searchParams] = useSearchParams()
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // searchParams → 직렬화 키 (random 모드 제외)
  const sessionId = (() => {
    const mode = searchParams.get('mode')
    if (mode === 'random') return null   // 랜덤은 매번 달라 복원 불필요
    return JSON.stringify({
      year: searchParams.get('year'),
      round: searchParams.get('round'),
      mode,
    })
  })()

  useEffect(() => {
    const params = {
      year: searchParams.get('year'),
      round: searchParams.get('round'),
      mode: searchParams.get('mode'),
      limit: 100,
    }
    Object.keys(params).forEach(k => params[k] == null && delete params[k])
    getQuestions(params).then(data => {
      setQuestions(data)
      // 세션 복원
      if (sessionId) {
        try {
          const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
          if (saved?.id === sessionId && saved.index < data.length) {
            setIndex(saved.index)
          }
        } catch { /* 무시 */ }
      }
      setLoading(false)
    })
  }, [searchParams])

  // 인덱스 변경 시 세션 저장
  useEffect(() => {
    if (!sessionId || !questions.length) return
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, index }))
  }, [index, sessionId, questions.length])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-slate-400 text-sm">문제를 불러오는 중...</span>
    </div>
  )

  if (!questions.length) return (
    <div className="text-center py-24 space-y-3">
      <div className="text-4xl">📭</div>
      <div className="text-slate-500">해당 조건의 문제가 없습니다.</div>
      <button onClick={() => navigate('/')} className="text-indigo-600 text-sm underline">홈으로 돌아가기</button>
    </div>
  )

  if (index >= questions.length) return (
    <div className="text-center py-24 space-y-4">
      <div className="text-6xl">🎉</div>
      <div className="text-2xl font-bold text-slate-700">모든 문제 완료!</div>
      <p className="text-slate-400 text-sm">총 {questions.length}문제를 풀었습니다.</p>
      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={() => { setIndex(0); localStorage.removeItem(SESSION_KEY) }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700"
        >
          다시 풀기
        </button>
        <button
          onClick={() => navigate('/')}
          className="border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-50"
        >
          홈으로
        </button>
      </div>
    </div>
  )

  const handleNext = () => setIndex(i => i + 1)

  return (
    <QuestionCard
      question={questions[index]}
      total={questions.length}
      current={index}
      onNext={handleNext}
      onSkip={handleNext}
    />
  )
}
