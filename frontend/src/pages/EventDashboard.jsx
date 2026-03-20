import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, getImageUrl } from '../utils/api'
import { supabase } from '../utils/supabaseClient'

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80',
]

const CATEGORY_MAP = {
  accommodation: { icon: '🏨', label: '宿泊' },
  transport: { icon: '🚗', label: '交通' },
  food: { icon: '🍽️', label: '食事' },
  ticket: { icon: '🎫', label: 'チケット' },
  shopping: { icon: '🛍️', label: '買い物' },
  other: { icon: '📦', label: 'その他' },
}

export default function EventDashboard({ user }) {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [editingMember, setEditingMember] = useState(null)
  const [editMemberName, setEditMemberName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const myName = user?.user_metadata?.full_name || user?.email

  useEffect(() => { 
    loadEvent() 

    // Set up real-time subscription
    const channel = supabase.channel(`event_${eventId}_updates`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Realtime change detected:', payload)
        loadEvent()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  async function loadEvent() {
    try { 
      const data = await api.getEvent(eventId)
      setEvent(data)
    }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAddMember(e) {
    if (e) e.preventDefault()
    if (!newMemberName.trim()) return
    try {
      await api.addMember(eventId, newMemberName.trim())
      setNewMemberName(''); setShowAddMember(false); loadEvent()
    } catch (err) { alert(err.message) }
  }

  async function handleUpdateMember(id) {
    if (!editMemberName.trim()) return
    try {
      await api.updateMember(eventId, id, editMemberName.trim())
      setEditingMember(null); setEditMemberName(''); loadEvent()
    } catch (err) { alert(err.message) }
  }

  async function handleDeleteMember(id, name) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try { await api.deleteMember(eventId, id); loadEvent() }
    catch (err) { alert(err.message) }
  }

  async function handleDeletePayment(id) {
    if (!confirm('この支払いを削除しますか？')) return
    try { await api.deletePayment(eventId, id); loadEvent() }
    catch (err) { alert(err.message) }
  }

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!event) return null

  /* ── Compute balances ── */
  const memberBalances = {}
  event.members.forEach(m => { memberBalances[m.id] = { ...m, paid: 0, owes: 0 } })
  event.payments.forEach(p => {
    if (memberBalances[p.payer_id]) memberBalances[p.payer_id].paid += p.amount
    const totalR = p.splits.reduce((s, x) => s + x.ratio, 0)
    if (totalR > 0) p.splits.forEach(s => {
      if (memberBalances[s.member_id]) memberBalances[s.member_id].owes += (s.ratio / totalR) * p.amount
    })
  })
  const totalAmount = event.payments.reduce((s, p) => s + p.amount, 0)
  const maxPaid = Math.max(...Object.values(memberBalances).map(b => b.paid), 1)

  const TABS = [
    { key: 'overview', label: 'Balance' },
    { key: 'payments', label: 'Activity' },
    { key: 'members', label: 'Members' },
  ]

  const coverUrl = event.image_url ? getImageUrl(event.image_url) : DEFAULT_COVERS[0]

  return (
    <div className="min-h-dvh flex flex-col relative pb-32">
      {/* ── Hero Header with Cover Image ── */}
      <header className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0A0A0E]"></div>
        </div>

        <div className="relative z-10 pt-12 pb-8 px-5">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate tracking-tight drop-shadow-lg">{event.name}</h1>
            </div>
          </div>

          <div className="text-center px-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 mb-1">TOTAL SPENT</p>
            <div className="flex justify-center items-end gap-1">
              <span className="text-2xl font-bold text-white/60 font-numeric mb-1.5">¥</span>
              <span className="text-5xl font-bold text-white font-numeric tracking-tight drop-shadow-lg">{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Native Segmented Control ── */}
      <div className="px-5 mb-8 mt-2">
        <div className="flex bg-[#111114] rounded-xl p-1.5 relative h-[52px]">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-200 z-10
                ${activeTab === tab.key ? 'text-black' : 'text-[#888888] hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
          {/* Active slider background */}
          <div className="absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] bg-[#00F0FF] rounded-lg transition-transform duration-300 ease-out"
               style={{ transform: `translateX(${TABS.findIndex(t => t.key === activeTab) * 100}%)` }} />
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 px-5">
        
        {/* ─ Overview ─ */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-slide-up">
            {Object.values(memberBalances).map((member, i) => {
              const balance = Math.round(member.paid - member.owes)
              const isPositive = balance > 0
              const isNegative = balance < 0
              return (
                <div key={member.id} className={`bank-card p-5 animate-slide-up stagger-${i + 1}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#111114] flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-bold text-white text-base">{member.name}</span>
                    </div>
                    <span className={`text-xl font-bold font-numeric tracking-tight
                      ${isPositive ? 'text-[#00FF7F]' : isNegative ? 'text-[#FF3B30]' : 'text-[#888]'}`}>
                      {isPositive ? '+' : ''}{balance !== 0 ? `¥${balance.toLocaleString()}` : '±0'}
                    </span>
                  </div>
                  
                  {/* Premium Progress Bar */}
                  <div className="h-2 bg-[#111114] rounded-full overflow-hidden mb-2 relative">
                    <div className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((member.paid / maxPaid) * 100, 100)}%` }} />
                  </div>
                  
                  <div className="flex justify-between text-[11px] font-medium text-[#888]">
                    <span>支払: <span className="font-numeric text-white">¥{Math.round(member.paid).toLocaleString()}</span></span>
                    <span>負担: <span className="font-numeric text-white">¥{Math.round(member.owes).toLocaleString()}</span></span>
                  </div>
                </div>
              )
            })}

            {event.members.length > 0 && event.payments.length > 0 && (
              <div className="pt-4">
                <button onClick={() => navigate(`/events/${eventId}/settlement`)}
                  className="w-full btn-primary py-4 text-sm tracking-wide">
                  スマート精算を開始
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─ Activity (Payments) ─ */}
        {activeTab === 'payments' && (
          <div className="bank-surface overflow-hidden animate-slide-up">
            {event.payments.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#888] font-medium">取引履歴がありません</p>
              </div>
            ) : event.payments.map((payment, i) => {
              const cat = CATEGORY_MAP[payment.category] || CATEGORY_MAP.other
              const payer = event.members.find(m => m.id === payment.payer_id)
              return (
                <div key={payment.id} className={`p-4 border-b border-[#333]/30 last:border-0 flex items-center gap-4 animate-slide-up stagger-${i + 1}`}>
                  <div className="w-12 h-12 rounded-full bg-[#1C1C21] flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">{payment.memo || cat.label}</p>
                    <p className="text-[11px] text-[#888] mt-0.5 tracking-wide">
                      PAID BY <span className="text-[#ccc] uppercase">{payer?.name || 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white font-numeric tracking-tight">¥{Number(payment.amount).toLocaleString()}</p>
                    <div className="flex justify-end gap-3 mt-1">
                      <button onClick={() => navigate(`/events/${eventId}/payments/${payment.id}/edit`)}
                        className="text-[10px] uppercase font-bold text-[#00F0FF] pt-1">Edit</button>
                      <button onClick={() => handleDeletePayment(payment.id)}
                        className="text-[10px] uppercase font-bold text-[#FF3B30] pt-1">Del</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─ Members ─ */}
        {activeTab === 'members' && (
          <div className="space-y-3 animate-slide-up">
            {event.members.map((member, i) => (
              <div key={member.id} className={`bank-card p-3 pl-4 flex items-center gap-4 animate-slide-up stagger-${i + 1}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1C1C21] to-[#111114] border border-[#333] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {member.name.charAt(0)}
                </div>
                {editingMember === member.id ? (
                  <div className="flex-1 flex gap-2">
                    <input type="text" value={editMemberName} onChange={e => setEditMemberName(e.target.value)}
                      autoFocus className="!py-2 !px-3 !bg-[#111114]"
                      onKeyDown={e => e.key === 'Enter' && handleUpdateMember(member.id)} />
                    <button onClick={() => handleUpdateMember(member.id)}
                      className="text-[#00F0FF] font-bold px-2 whitespace-nowrap">Save</button>
                    <button onClick={() => setEditingMember(null)}
                      className="text-[#888] font-bold px-2 text-xl mb-1">×</button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-base font-bold text-white">{member.name}</span>
                    <button onClick={() => { setEditingMember(member.id); setEditMemberName(member.name) }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[#888] hover:bg-[#111] hover:text-[#00F0FF]">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDeleteMember(member.id, member.name)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[#888] hover:bg-[#111] hover:text-[#FF3B30]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </>
                )}
              </div>
            ))}

            {showAddMember ? (
              <form onSubmit={handleAddMember} className="bank-surface p-4 pt-5 mt-4">
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                  placeholder="Player Name" autoFocus className="mb-4" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowAddMember(false); setNewMemberName('') }}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C21] text-white font-bold">Cancel</button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl btn-primary">Add</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAddMember(true)}
                className="w-full py-4 mt-2 rounded-[20px] border-2 border-dashed border-[#333]
                           text-[#888] font-bold hover:text-[#00F0FF] hover:border-[#00F0FF]/50
                           transition-all active:scale-[0.98]">
                ＋ Add Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky FAB ── */}
      {event.members.length > 0 && activeTab !== 'members' && (
        <div className="sticky-bottom-action flex justify-end">
          <button onClick={() => navigate(`/events/${eventId}/payments/new`)}
            className="w-16 h-16 fab flex items-center justify-center"
            aria-label="支払いを追加">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
