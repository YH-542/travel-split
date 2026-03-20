import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getImageUrl } from '../utils/api'

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80',
]

import { supabase } from '../utils/supabaseClient'

export default function HomePage({ user }) {
  const [events, setEvents] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventImage, setNewEventImage] = useState(null)
  const [newEventImageUrl, setNewEventImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingBg, setIsUploadingBg] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { loadEventsWithDetails() }, [user])

  async function loadEventsWithDetails() {
    setLoading(true)
    try {
      const allEvents = await api.getEvents()
      const myName = user?.user_metadata?.full_name || user?.email
      
      const detailedEvents = allEvents.map((e) => {
        let myCost = 0
        let isParticipating = false
        let eventTotal = 0

        // Calculate event total and personal cost if joined
        const me = e.members.find(m => m.name.toLowerCase() === myName?.toLowerCase())
        if (me) isParticipating = true

        e.payments.forEach(p => {
          eventTotal += Number(p.amount)
          const totalR = p.splits.reduce((s, x) => s + x.ratio, 0)
          if (totalR > 0) {
            if (me) {
              const mySplit = p.splits.find(s => s.member_id === me.id)
              if (mySplit) myCost += (mySplit.ratio / totalR) * p.amount
            }
          }
        })

        return { 
          ...e, 
          myCost, 
          isParticipating, 
          total_amount: eventTotal, 
          member_count: e.members.length 
        }
      })
      setEvents(detailedEvents)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function handleSaveName(e) {
    if (e) e.preventDefault()
    if (!tempName.trim()) return
    setMyGlobalName(tempName.trim())
    localStorage.setItem('travelSplit_myName', tempName.trim())
    setIsEditingName(false)
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setNewEventImage(base64)
      try {
        const { url } = await api.uploadImage(base64)
        setNewEventImageUrl(url)
      } catch (err) { console.error('Upload failed:', err) }
      finally { setIsUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newEventName.trim()) return
    try {
      const event = await api.createEvent(newEventName.trim(), [], newEventImageUrl || '')
      if (myGlobalName) await api.addMember(event.id, myGlobalName)
      setNewEventName(''); setNewEventImage(null); setNewEventImageUrl(''); setShowCreate(false)
      navigate(`/events/${event.id}`)
    } catch (err) { alert(err.message) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try {
      await api.deleteEvent(id)
      setEvents(events.filter(e => e.id !== id))
    } catch (err) { alert(err.message) }
  }

  async function handleChangeEventImage(eventId, eventName) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setIsUploadingBg(true)
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const { url } = await api.uploadImage(ev.target.result)
          await api.updateEvent(eventId, { name: eventName, image_url: url })
          loadEventsWithDetails()
        } catch (err) { alert('画像の更新に失敗しました') }
        finally { setIsUploadingBg(false) }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-[#0A0A0E]">
      {/* ── Header ── */}
      <header className="px-6 pt-14 pb-6 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4 animate-slide-up">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] p-[2px] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <div className="w-full h-full bg-[#111114] rounded-full flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-lg">{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Hi, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'} 👋</h1>
            <p className="text-[11px] text-[#888] font-medium">Ready for the next trip?</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-5 pb-36 relative z-10 w-full max-w-lg mx-auto">
        {(loading || isUploadingBg) ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : events.length === 0 && !showCreate ? (
          <div className="animate-slide-up bg-[#111114] border border-[#222] rounded-[24px] p-8 text-center mt-6">
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-lg font-bold text-white mb-2 tracking-tight">旅の記録を作ろう</h2>
            <p className="text-xs text-[#888888] mb-6 leading-relaxed">旅行イベントを作成して、<br />割り勘を美しく管理しましょう。</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary w-full py-4 text-sm font-bold tracking-wide">最初の旅行を作成</button>
          </div>
        ) : (
          /* ── Photo-Background Travel Cards ── */
          <div className="space-y-10">
            {events.map((event, i) => {
              const coverUrl = event.image_url
                ? getImageUrl(event.image_url)
                : DEFAULT_COVERS[i % DEFAULT_COVERS.length]
              const recentPayment = event.payments?.[0]

              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className={`relative overflow-hidden rounded-[10px] cursor-pointer animate-slide-up stagger-${i + 1} transition-transform active:scale-[0.98] shadow-[0_8px_30px_rgba(0,0,0,0.5)]`}
                >
                  {/* Cover Photo */}
                  <div className="absolute inset-0">
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10"></div>
                  </div>

                  {/* Content - generous padding */}
                  <div className="relative z-10 p-8 flex flex-col" style={{ minHeight: '260px' }}>
                    {/* Top: Title & Actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg leading-snug mb-2">{event.name}</h3>
                        <p className="text-[13px] text-white/70 font-medium drop-shadow-md">
                          {event.member_count || event.members?.length || 0} members
                        </p>
                      </div>
                      <div className="flex gap-2.5 flex-shrink-0 pt-1">
                        <button onClick={e => { e.stopPropagation(); handleChangeEventImage(event.id, event.name) }}
                          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white transition-colors" title="画像を変更">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(event.id, event.name) }}
                          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-[#FF3B30] transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Bottom: Recent + Cost Badge */}
                    <div className="flex items-end justify-between gap-5 mt-8">
                      <div className="flex-1 min-w-0 pb-1">
                        {recentPayment && (
                          <p className="text-xs text-white/60 truncate drop-shadow-sm leading-relaxed">
                            Recent: <br /><span className="text-white/90 font-medium">{recentPayment.memo || recentPayment.payer_name}</span> | <span className="font-numeric">¥{Number(recentPayment.amount).toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`px-5 py-3 rounded-2xl backdrop-blur-md border
                          ${event.isParticipating
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                            : 'bg-white/10 border-white/20'}`}>
                          <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5"
                            style={{ color: event.isParticipating ? '#00F0FF' : 'rgba(255,255,255,0.6)' }}>
                            {event.isParticipating ? 'Your Cost' : 'Trip Total'}
                          </p>
                          <p className={`text-lg font-bold font-numeric tracking-tight ${event.isParticipating ? 'text-white' : 'text-white/80'}`}>
                            ¥{Math.round(event.isParticipating ? event.myCost : (event.total_amount || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Create Modal ── */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreate(false); setNewEventImage(null); setNewEventImageUrl('') }}></div>
            <div className="bank-surface rounded-t-[32px] rounded-b-none p-6 pt-8 pb-10 relative z-10 animate-slide-up border-t border-[#333] border-x-0 border-b-0 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-1 bg-[#444] rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2"></div>
              <h2 className="text-xl font-bold text-white mb-6 tracking-tight">新しい旅行</h2>
              <form onSubmit={handleCreate}>
                <div onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`w-full h-36 rounded-2xl mb-5 overflow-hidden border-2 border-dashed border-[#333] transition-colors flex items-center justify-center relative
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#00F0FF]/50'}`}>
                  {newEventImage ? (
                    <img src={newEventImage} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-[#888]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      <p className="text-xs">カバー写真を選択</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
                <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)}
                  placeholder="例：京都の秋旅行" autoFocus className="mb-5 !text-lg !py-4 !bg-[#1A1A24] !border-[#333] focus:!border-[#00F0FF]" />
                <button type="submit" disabled={!newEventName.trim() || isUploading}
                  className="w-full btn-primary py-4 text-base tracking-wide flex justify-center items-center gap-2">
                  {isUploading ? 'アップロード中...' : '作成してスタート'}
                  {!isUploading && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky FAB ── */}
      {events.length > 0 && !showCreate && (
        <div className="sticky-bottom-action flex justify-end">
          <button onClick={() => setShowCreate(true)}
            className="w-16 h-16 fab flex items-center justify-center shadow-[0_4px_30px_rgba(0,240,255,0.4)] active:scale-90 transition-transform"
            aria-label="新規イベント">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
