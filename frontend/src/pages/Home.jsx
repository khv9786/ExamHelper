import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getYears, getStats } from '../api'

const STAT_CARDS = [
  { key: 'total_questions', label: '전체 문제', cls: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
  { key: 'solved',          label: '풀이 완료', cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  { key: 'correct',         label: '정답 수',   cls: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
  { key: 'accuracy',        label: '정답률',    cls: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', suffix: '%' },
]

export default function Home() {
  const [years, setYears] = useState({})
  const [stats, setStats] = useState(null)
  const [selected, setSelected] = useState({ year: '', round: '', mode: 'sequential' })
  const navigate = useNavigate()

  useEffect(() => {
    getYears().then(setYears)
    getStats().then(setStats)
  }, [])

  const handleStart = () => {
    const params = new URLSearchParams()
    if (selected.year) params.set('year', selected.year)
    if (selected.round) params.set('round', selected.round)
    if (selected.mode === 'random') params.set('mode', 'random')
    navigate(`/exam?${params}`)
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">정보처리기사 실기 연습</h1>
        <p className="text-slate-400 text-sm">2022~2025년 기출문제로 실기를 완벽 대비하세요</p>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ key, label, cls, bg, suffix }) => (
            <div key={key} className={`rounded-2xl border p-4 text-center ${bg}`}>
              <div className={`text-2xl font-bold ${cls}`}>
                {stats[key]}{suffix || ''}
              </div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 문제 선택 */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">문제 선택</h2>
          <p className="text-xs text-slate-400 mt-0.5">연도, 회차, 출제 방식을 설정하세요</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 연도 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">연도</label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:border-indigo-400 transition-colors bg-white"
                value={selected.year}
                onChange={e => setSelected(s => ({ ...s, year: e.target.value, round: '' }))}
              >
                <option value="">전체 연도</option>
                {Object.keys(years).map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            {/* 회차 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">회차</label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:border-indigo-400 transition-colors bg-white
                           disabled:opacity-40 disabled:cursor-not-allowed"
                value={selected.round}
                onChange={e => setSelected(s => ({ ...s, round: e.target.value }))}
                disabled={!selected.year}
              >
                <option value="">전체 회차</option>
                {(years[selected.year] || []).map(r => <option key={r} value={r}>{r}회</option>)}
              </select>
            </div>
            {/* 출제 방식 */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">출제 방식</label>
              <div className="flex gap-2">
                {[
                  { value: 'sequential', label: '순서대로' },
                  { value: 'random',     label: '랜덤' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelected(s => ({ ...s, mode: opt.value }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                      selected.mode === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold
                       hover:bg-indigo-700 transition-colors text-sm"
          >
            시작하기 →
          </button>
        </div>
      </div>

      {/* 바로가기 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '오답 노트',  desc: '틀린 문제만 모아서 복습',  icon: '📌', path: '/wrong',   color: 'hover:border-rose-300' },
          { title: '요약 정리',  desc: '핵심 개념 빠르게 훑기',    icon: '📚', path: '/summary', color: 'hover:border-amber-300' },
          { title: '학습 통계',  desc: '나의 풀이 현황 한눈에',    icon: '📊', path: '/stats',   color: 'hover:border-emerald-300' },
        ].map(({ title, desc, icon, path, color }) => (
          <button
            key={title}
            onClick={() => navigate(path)}
            className={`bg-white rounded-2xl p-5 border-2 border-slate-100 text-left
                        transition-all hover:shadow-md ${color}`}
          >
            <div className="text-3xl mb-3">{icon}</div>
            <div className="font-semibold text-slate-700">{title}</div>
            <div className="text-xs text-slate-400 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
