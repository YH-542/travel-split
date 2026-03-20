import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './utils/supabaseClient'
import HomePage from './pages/HomePage'
import EventDashboard from './pages/EventDashboard'
import PaymentForm from './pages/PaymentForm'
import SettlementResult from './pages/SettlementResult'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A0A0E]">
        <div className="w-8 h-8 border-[3px] border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-[#0A0A0E] flex flex-col items-center justify-center px-8 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#7000FF]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00F0FF]/10 blur-[120px] rounded-full"></div>

        <div className="relative z-10 text-center space-y-8 animate-slide-up">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-[#00F0FF]/20">
              <span className="text-4xl">✈️</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Travel Split</h1>
            <p className="text-[#888] text-sm leading-relaxed max-w-[240px] mx-auto">
              旅行の割り勘を、<br/>もっとスマートに、美しく。
            </p>
          </div>

          <button onClick={handleLogin}
            className="w-full max-w-[280px] bg-white text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#eee] transition-all active:scale-95 shadow-xl">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
          
          <p className="text-[10px] text-[#444] tracking-widest uppercase">Premium Travel companion</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Routes>
        <Route path="/" element={<HomePage user={session.user} />} />
        <Route path="/events/:eventId" element={<EventDashboard user={session.user} />} />
        <Route path="/events/:eventId/payments/new" element={<PaymentForm user={session.user} />} />
        <Route path="/events/:eventId/payments/:paymentId/edit" element={<PaymentForm user={session.user} />} />
        <Route path="/events/:eventId/settlement" element={<SettlementResult user={session.user} />} />
      </Routes>
    </div>
  )
}

export default App
