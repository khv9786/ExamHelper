import { useEffect, useState } from 'react'
import { getAdminQuestions, patchAdminQuestion } from '../api'

const FILTERS = [
  { key: null, label: '전체' },
  { key: 'needs_review', label: '신고됨' },
  { key: 'unverified', label: '미검증' },
]

function QuestionEditCard({ q, onSaved }) {
  const [form, setForm] = useState({
    question_text: q.question_text,
    code_block: q.code_block || '',
    answer: q.answer || '',
    review_memo: q.review_memo || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      question_text: form.question_text,
      code_block: form.code_block || null,
      answer: form.answer || null,
      review_memo: form.review_memo || null,
    }
    await patchAdminQuestion(q.id, payload)
    setSaving(false)
    setSaved(true)
    onSaved()
  }

  const handleVerify = async () => {
    setSaving(true)
    await patchAdminQuestion(q.id, {
      question_text: form.question_text,
      code_block: form.code_block || null,
      answer: form.answer || null,
      review_memo: form.review_memo || null,
      is_verified: true,
      needs_review: false,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3 ${
      q.needs_review ? 'border-red-200' : q.is_verified ? 'border-green-200' : 'border-slate-200'
    }`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          #{q.id}
        </span>
        {q.year && (
          <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
            {q.year}년 {q.round}회 Q{q.number}
          </span>
        )}
        {q.needs_review && (
          <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-medium">신고됨</span>
        )}
        {q.is_verified && (
          <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full font-medium">검토완료</span>
        )}
        <span className="ml-auto text-xs text-slate-400 truncate max-w-xs">{q.post_title}</span>
      </div>

      {/* 문제 */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">문제</label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-400"
          rows={4}
          value={form.question_text}
          onChange={e => handleChange('question_text', e.target.value)}
        />
      </div>

      {/* 코드 블록 */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">코드 블록 (없으면 비워두기)</label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:border-indigo-400 bg-slate-50"
          rows={4}
          value={form.code_block}
          onChange={e => handleChange('code_block', e.target.value)}
        />
      </div>

      {/* 정답 */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">정답</label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          value={form.answer}
          onChange={e => handleChange('answer', e.target.value)}
        />
      </div>

      {/* 검토 메모 */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">관리자 메모</label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          placeholder="메모 (선택)"
          value={form.review_memo}
          onChange={e => handleChange('review_memo', e.target.value)}
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
        </button>
        <button
          onClick={handleVerify}
          disabled={saving || q.is_verified}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          검토 완료
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const [filter, setFilter] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getAdminQuestions(filter)
      .then(data => setQuestions(Array.isArray(data) ? data : []))
      .catch(err => { console.error('admin load error:', err); setQuestions([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">문제 관리</h1>
        <span className="text-sm text-slate-400">{questions.length}건</span>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 text-slate-400">해당 문제가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <QuestionEditCard key={q.id} q={q} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  )
}
