import { useEffect, useState } from 'react'
import { getQuestions } from '../api'

export default function Summary() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getQuestions({ source_type: 'summary', limit: 100 }).then(data => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-center text-slate-400 py-20">불러오는 중...</div>
  if (!items.length) return (
    <div className="text-center py-20 space-y-2">
      <div className="text-4xl">📚</div>
      <div className="text-slate-500">요약 정리 데이터가 없습니다.</div>
    </div>
  )

  // post_title 기준으로 그룹핑
  const grouped = items.reduce((acc, item) => {
    acc[item.post_title] = acc[item.post_title] || []
    acc[item.post_title].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-700">요약 정리</h2>
      {Object.entries(grouped).map(([title, questions]) => (
        <div key={title} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            className="w-full text-left p-4 hover:bg-slate-50 flex justify-between items-center"
            onClick={() => setExpanded(expanded === title ? null : title)}
          >
            <div>
              <div className="font-medium text-slate-700">{title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{questions.length}개 항목</div>
            </div>
            <span className="text-slate-400">{expanded === title ? '▲' : '▼'}</span>
          </button>
          {expanded === title && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {questions.map(q => (
                <div key={q.id} className="px-4 py-3">
                  <div className="text-sm text-slate-700 leading-relaxed">{q.question_text}</div>
                  {q.code_block && (
                    <pre className="bg-slate-800 text-green-300 rounded-lg p-3 text-xs mt-2 overflow-x-auto">
                      {q.code_block}
                    </pre>
                  )}
                  {q.answer && (
                    <div className="mt-2 text-xs bg-blue-50 text-blue-700 rounded px-2 py-1">
                      답: {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
