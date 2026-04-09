import { useEffect, useState } from 'react'
import { getWrongNotes } from '../api'

export default function WrongNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getWrongNotes().then(data => { setNotes(data); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center text-slate-400 py-20">불러오는 중...</div>
  if (!notes.length) return (
    <div className="text-center py-20 space-y-2">
      <div className="text-4xl">🎯</div>
      <div className="text-slate-500">오답 기록이 없습니다. 문제를 먼저 풀어보세요!</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-700">오답 노트 ({notes.length}개)</h2>
      {notes.map(({ question_id, question }) => (
        <div key={question_id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            className="w-full text-left p-4 hover:bg-slate-50 flex items-start gap-3"
            onClick={() => setExpanded(expanded === question_id ? null : question_id)}
          >
            <span className="text-red-400 mt-0.5">❌</span>
            <div className="flex-1">
              <div className="text-xs text-slate-400 mb-1">{question.post_title}</div>
              <div className="text-sm text-slate-700 line-clamp-2">{question.question_text}</div>
            </div>
            <span className="text-slate-400 text-sm">{expanded === question_id ? '▲' : '▼'}</span>
          </button>
          {expanded === question_id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <div className="text-sm text-slate-700 mb-3 leading-relaxed">{question.question_text}</div>
              {question.answer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-green-700">정답: </span>
                  <span className="text-slate-700">{question.answer}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
