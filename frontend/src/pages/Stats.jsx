import { useEffect, useState } from 'react'
import { getStats } from '../api'

export default function Stats() {
  const [stats, setStats] = useState(null)

  useEffect(() => { getStats().then(setStats) }, [])

  if (!stats) return <div className="text-center text-slate-400 py-20">불러오는 중...</div>

  const solved_pct = stats.total_questions > 0
    ? Math.round((stats.solved / stats.total_questions) * 100) : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-700">나의 학습 통계</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체 문제', value: stats.total_questions, color: 'text-slate-700' },
          { label: '풀이 완료', value: stats.solved, color: 'text-indigo-600' },
          { label: '정답 수', value: stats.correct, color: 'text-green-600' },
          { label: '오답 수', value: stats.wrong, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">풀이 진행률</span>
            <span className="font-medium text-indigo-600">{solved_pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="bg-indigo-500 h-3 rounded-full transition-all" style={{ width: `${solved_pct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">정답률</span>
            <span className="font-medium text-green-600">{stats.accuracy}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${stats.accuracy}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="text-center">
          <div className="text-5xl font-bold text-purple-600">{stats.accuracy}%</div>
          <div className="text-slate-400 mt-2">전체 정답률</div>
        </div>
      </div>
    </div>
  )
}
