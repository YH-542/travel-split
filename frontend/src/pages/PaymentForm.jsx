import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, getImageUrl } from '../utils/api'

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
]

const CATEGORIES = [
  { key: 'accommodation', icon: '🏨', label: '宿泊' },
  { key: 'transport', icon: '🚗', label: '交通' },
  { key: 'food', icon: '🍽️', label: '食事' },
  { key: 'ticket', icon: '🎫', label: 'チケット' },
  { key: 'shopping', icon: '🛍️', label: '買い物' },
  { key: 'other', icon: '📦', label: 'その他' },
]

export default function PaymentForm() {
  const { eventId, paymentId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!paymentId

  const [members, setMembers] = useState([])
  const [eventImageUrl, setEventImageUrl] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState('')
  const [category, setCategory] = useState('other')
  const [memo, setMemo] = useState('')
  const [splitMode, setSplitMode] = useState('equal') // equal | amount | ratio
  const [customSplits, setCustomSplits] = useState({}) 
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [eventId, paymentId])

  async function loadData() {
    try {
      const eventData = await api.getEvent(eventId)
      setMembers(eventData.members)
      setEventImageUrl(eventData.image_url || '')
      const initial = {}
      eventData.members.forEach(m => { initial[m.id] = { checked: true, ratio: 1.0, amount: '' } })
      setCustomSplits(initial)

      if (isEdit) {
        const payment = eventData.payments.find(p => p.id === paymentId)
        if (payment) {
          setAmount(String(payment.amount))
          setPayerId(payment.payer_id)
          setCategory(payment.category)
          setMemo(payment.memo || '')
          if (payment.splits.length < eventData.members.length || payment.splits.some(s => s.ratio !== 1.0)) {
            setSplitMode('ratio')
            const es = {}
            eventData.members.forEach(m => {
              const sp = payment.splits.find(s => s.member_id === m.id)
              es[m.id] = { checked: !!sp, ratio: sp ? sp.ratio : 1.0, amount: '' }
            })
            setCustomSplits(es)
          }
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    const amountNum = Number(amount)
    if (!amount || amountNum <= 0) return alert('金額を入力してください')
    if (!payerId) return alert('支払者を選択してください')

    setSubmitting(true)
    try {
      let splits = null

      if (splitMode === 'amount') {
        const checked = Object.entries(customSplits).filter(([, v]) => v.checked && Number(v.amount) > 0)
        if (checked.length === 0) return alert('負担額を1人以上入力してください')
        const totalSpecified = checked.reduce((s, [, v]) => s + Number(v.amount), 0)
        if (Math.abs(totalSpecified - amountNum) > 1) {
          return alert(`指定額の合計 (¥${totalSpecified.toLocaleString()}) と支払額 (¥${amountNum.toLocaleString()}) が一致しません`)
        }
        splits = checked.map(([id, v]) => ({ member_id: id, ratio: Number(v.amount) }))
      } else if (splitMode === 'ratio') {
        const checked = Object.entries(customSplits).filter(([, v]) => v.checked)
        if (checked.length === 0) return alert('対象者を1人以上選んでください')
        splits = checked.map(([id, v]) => ({ member_id: id, ratio: v.ratio }))
      }

      const data = { payer_id: payerId, amount: amountNum, category, memo, splits }
      if (isEdit) await api.updatePayment(eventId, paymentId, data)
      else await api.addPayment(eventId, data)
      navigate(`/events/${eventId}`)
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  function toggleMember(id) { setCustomSplits(p => ({ ...p, [id]: { ...p[id], checked: !p[id].checked } })) }
  function updateRatio(id, v) { setCustomSplits(p => ({ ...p, [id]: { ...p[id], ratio: Math.max(0.1, Number(v) || 1) } })) }
  function updateAmount(id, v) { setCustomSplits(p => ({ ...p, [id]: { ...p[id], amount: v } })) }

  const amountNum = Number(amount) || 0
  const checkedEntries = Object.entries(customSplits).filter(([, v]) => v.checked)
  const totalSpecified = splitMode === 'amount'
    ? checkedEntries.reduce((s, [, v]) => s + (Number(v.amount) || 0), 0) : 0
  const amountDiff = amountNum - totalSpecified
  const totalRatio = checkedEntries.reduce((s, [, v]) => s + v.ratio, 0)

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const coverUrl = eventImageUrl ? getImageUrl(eventImageUrl) : DEFAULT_COVERS[0]

  return (
    <div className="min-h-dvh flex flex-col relative pb-32">
      {/* ── Hero Header with Cover Image ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-[#0A0A0E]"></div>
        </div>
        <div className="relative z-10">
          <div className="px-5 pt-10 pb-2">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate(`/events/${eventId}`)}
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors active:scale-95 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-[11px] font-bold tracking-widest text-white/70 uppercase">
                {isEdit ? 'Edit Transaction' : 'New Transaction'}
              </span>
              <div className="w-10"></div>
            </div>
          </div>

          {/* ── Massive Amount Input ── */}
          <div className="px-5 py-6">
            <div className="relative flex justify-center items-center">
              <span className="text-2xl text-white/50 font-numeric mr-1 absolute left-[15%]">¥</span>
              <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0" autoFocus
                className="input-massive w-full" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 space-y-8 animate-slide-up">
        {/* ── Payer ── */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#888] mb-3">Paid By</label>
          <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {members.map(m => (
              <button key={m.id} type="button" onClick={() => setPayerId(m.id)}
                className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-xl transition-all duration-200 snap-center
                  ${payerId === m.id
                    ? 'border-2 border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_4px_20px_rgba(0,240,255,0.15)]'
                    : 'bg-[#111114] border-2 border-transparent text-[#888]'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${payerId === m.id ? 'bg-[#00F0FF] text-black' : 'bg-[#1C1C21]'}`}>{m.name.charAt(0)}</span>
                <span className={`text-sm font-bold ${payerId === m.id ? 'text-white' : 'text-[#888]'}`}>{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Category ── */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#888] mb-3">Category</label>
          <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} type="button" onClick={() => setCategory(cat.key)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[84px] h-[84px] rounded-xl transition-all duration-200 snap-center
                  ${category === cat.key
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-[#111114] text-[#888] hover:bg-[#1C1C21]'}`}>
                <span className="text-3xl mb-1">{cat.icon}</span>
                <span className="text-[10px] font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Memo ── */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#888] mb-3">Note</label>
          <input type="text" value={memo} onChange={e => setMemo(e.target.value)} 
                 placeholder="What was this for?" 
                 className="!bg-[#111114] !border-transparent !text-lg !py-4" />
        </div>

        {/* ── Split Mode ── */}
        <div className="pb-8">
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#888] mb-3">Split Rules</label>
          <div className="flex bg-[#111114] rounded-xl p-1 relative mb-5">
            {[
              { key: 'equal', label: '均等' },
              { key: 'amount', label: '金額指定' },
              { key: 'ratio', label: '比率' },
            ].map(m => (
              <button key={m.key} type="button" onClick={() => setSplitMode(m.key)}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all duration-200 z-10
                  ${splitMode === m.key ? 'text-white' : 'text-[#888] hover:text-[#ccc]'}`}>
                {m.label}
              </button>
            ))}
            <div className="absolute top-1 bottom-1 w-[calc(33.333%-2px)] bg-[#333] rounded-lg transition-transform duration-300 ease-out"
                 style={{ transform: `translateX(${['equal', 'amount', 'ratio'].indexOf(splitMode) * 100}%)` }} />
          </div>

          {/* ─ Amount-based split ─ */}
          {splitMode === 'amount' && (
            <div className="space-y-3 animate-slide-up">
              {amountDiff !== 0 && amountNum > 0 && (
                <div className={`p-4 rounded-xl flex items-center justify-between
                  ${Math.abs(amountDiff) < 2 ? 'bg-[#00FF7F]/10 border border-[#00FF7F]/20' : 'bg-[#FF3B30]/10 border border-[#FF3B30]/20'}`}>
                  <span className={`text-sm font-bold ${Math.abs(amountDiff) < 2 ? 'text-[#00FF7F]' : 'text-[#FF3B30]'}`}>
                    {amountDiff > 0 ? `${amountDiff.toLocaleString()} 残り` : `${Math.abs(amountDiff).toLocaleString()} 超過`}
                  </span>
                  {amountDiff > 0 && checkedEntries.length > 0 && (
                    <button type="button"
                      onClick={() => {
                        const checked = Object.entries(customSplits).filter(([, v]) => v.checked)
                        const perPerson = Math.floor(amountNum / checked.length)
                        const remainder = amountNum - perPerson * checked.length
                        const updated = { ...customSplits }
                        checked.forEach(([id], i) => {
                          updated[id] = { ...updated[id], amount: String(perPerson + (i < remainder ? 1 : 0)) }
                        })
                        setCustomSplits(updated)
                      }}
                      className="text-xs bg-[#00FF7F]/20 text-[#00FF7F] px-3 py-1.5 rounded-md font-bold">
                      均等割
                    </button>
                  )}
                </div>
              )}
              {members.map((m, i) => {
                const sp = customSplits[m.id]
                if (!sp) return null
                return (
                  <div key={m.id} className={`bank-card p-2 pl-4 flex items-center gap-4 stagger-${i+1}`}>
                    <button type="button" onClick={() => toggleMember(m.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${sp.checked ? 'bg-[#00F0FF] border-[#00F0FF]' : 'border-[#444]'}`}>
                      {sp.checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                    <span className={`text-base font-bold flex-1 ${sp.checked ? 'text-white' : 'text-[#666]'}`}>{m.name}</span>
                    {sp.checked && (
                      <div className="flex items-center bg-[#111114] rounded-lg border border-[#333] px-3 py-1 focus-within:border-[#00F0FF] transition-colors">
                        <span className="text-[#888] font-numeric text-sm mr-1">¥</span>
                        <input type="number" inputMode="numeric" value={sp.amount}
                          onChange={e => updateAmount(m.id, e.target.value)}
                          placeholder="0"
                          className="!bg-transparent !border-none !p-0 !text-right !font-numeric !text-lg !w-24 focus:!ring-0" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ─ Ratio-based split ─ */}
          {splitMode === 'ratio' && (
            <div className="space-y-3 animate-slide-up">
              {members.map((m, i) => {
                const sp = customSplits[m.id]
                if (!sp) return null
                const share = sp.checked && totalRatio > 0 ? Math.round((sp.ratio / totalRatio) * amountNum) : 0
                return (
                  <div key={m.id} className={`bank-card p-2 pl-4 flex items-center gap-4 stagger-${i+1}`}>
                    <button type="button" onClick={() => toggleMember(m.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${sp.checked ? 'bg-[#00F0FF] border-[#00F0FF]' : 'border-[#444]'}`}>
                      {sp.checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                    <span className={`text-base font-bold flex-1 ${sp.checked ? 'text-white' : 'text-[#666]'}`}>{m.name}</span>
                    {sp.checked && (
                      <div className="flex items-center gap-3">
                        <input type="number" inputMode="decimal" step="0.1" min="0.1"
                          value={sp.ratio} onChange={e => updateRatio(m.id, e.target.value)}
                          className="!w-16 !p-2 !text-center !bg-[#111114] !border-[#333] !font-numeric" />
                        <span className="text-sm text-[#888] font-numeric font-bold w-20 text-right">¥{share.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Action ── */}
      <div className="sticky-bottom-action">
        <button type="button" onClick={handleSubmit} disabled={submitting || !amount || !payerId}
          className="w-full btn-primary py-4 text-lg tracking-wide disabled:opacity-50">
          {submitting ? '処理中…' : isEdit ? '更新する' : '支払いを追加'}
        </button>
      </div>
    </div>
  )
}
