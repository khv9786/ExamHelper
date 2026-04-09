import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Exam from './pages/Exam'
import WrongNotes from './pages/WrongNotes'
import Stats from './pages/Stats'
import Summary from './pages/Summary'
import Admin from './pages/Admin'

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-indigo-600 mr-4 text-lg">📝 정보처리기사 실기</span>
            <NavItem to="/" label="홈" />
            <NavItem to="/exam" label="문제 풀기" />
            <NavItem to="/wrong" label="오답 노트" />
            <NavItem to="/summary" label="요약 정리" />
            <NavItem to="/stats" label="통계" />
            <NavItem to="/admin" label="관리" />
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/exam" element={<Exam />} />
            <Route path="/wrong" element={<WrongNotes />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
