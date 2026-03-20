import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, getImageUrl } from '../utils/api'

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
]

export default function SettlementResult() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [settlement, setSettlement] = useState(null)
  const [eventDetail, setEventDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [eventId])

  async function loadData() {
    try {
      const [s, e] = await Promise.all([api.getSettlement(eventId), api.getEvent(eventId)])
      setSettlement(s); setEventDetail(e)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleShareLine() {
    if (!settlement) return
    window.open(`https://line.me/R/share?text=${encodeURIComponent(settlement.share_text)}`, '_blank')
  }

  function handleShareGeneric() {
    if (!settlement || !navigator.share) return
    navigator.share({ title: `${settlement.event_name} 精算結果`, text: settlement.share_text }).catch(() => {})
  }

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!settlement) return null

  const coverUrl = eventDetail?.image_url ? getImageUrl(eventDetail.image_url) : DEFAULT_COVERS[0]

  return (
    <div className="min-h-dvh flex flex-col relative pb-32">
      {/* ── Hero Header with Cover Image ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0A0A0E]"></div>
        </div>
        <div className="relative z-10 px-5 pt-10 pb-8">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate(`/events/${eventId}`)}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors active:scale-95 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-xs font-bold tracking-widest text-[#00F0FF] uppercase px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md">
              Settlement
            </span>
            <div className="w-10"></div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center drop-shadow-lg">{settlement.event_name}</h1>
        </div>
      </header>

      <main className="flex-1 px-5 animate-slide-up space-y-8">
        {/* ── Transfers (Main Focus) ── */}
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#888] mb-4">Required Transfers</h3>
          {settlement.settlements.length === 0 ? (
            <div className="bank-card p-10 text-center">
              <div className="w-16 h-16 mx-auto bg-[#00FF7F]/10 rounded-full flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF7F" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <p className="text-white font-bold text-lg">決済完了</p>
              <p className="text-sm text-[#888] mt-2">全員に精算の必要はありません。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlement.settlements.map((s, i) => (
                <div key={i} className={`bank-card p-5 animate-slide-up stagger-${i + 1}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-numeric text-3xl font-bold text-white tracking-tight">¥{s.amount.toLocaleString()}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#888] bg-[#111114] px-2 py-1 rounded">Transfer</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* From (Sender) */}
                    <div className="flex items-center gap-3 w-5/12">
                      <div className="w-10 h-10 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center text-[#FF3B30] font-bold flex-shrink-0">
                        {s.from_name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white truncate">{s.from_name}</span>
                    </div>

                    {/* Arrow */}
                    <div className="flex-1 flex justify-center items-center">
                      <div className="h-[2px] w-full bg-gradient-to-r from-[#FF3B30] to-[#00FF7F] rounded-full relative">
                        <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-[#00FF7F]"></div>
                      </div>
                    </div>

                    {/* To (Receiver) */}
                    <div className="flex items-center justify-end gap-3 w-5/12">
                      <span className="text-sm font-bold text-white truncate text-right">{s.to_name}</span>
                      <div className="w-10 h-10 rounded-full bg-[#00FF7F]/10 border border-[#00FF7F]/30 flex items-center justify-center text-[#00FF7F] font-bold flex-shrink-0">
                        {s.to_name.charAt(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Balance Summary ── */}
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#888] mb-4">Balance Sheet</h3>
          <div className="grid grid-cols-2 gap-3">
            {settlement.balances.map((b, i) => {
              const net = Math.round(b.balance)
              const isPos = net > 0
              const isNeg = net < 0
              return (
                <div key={b.id} className={`bank-surface p-4 animate-slide-up stagger-${i + 2}`}>
                  <span className="text-sm font-bold text-white block mb-2 truncate">{b.name}</span>
                  <div className={`font-numeric text-xl font-bold tracking-tight mb-2
                    ${isPos ? 'text-[#00FF7F]' : isNeg ? 'text-[#FF3B30]' : 'text-[#888]'}`}>
                    {isPos ? `+¥${net.toLocaleString()}` : isNeg ? `-¥${Math.abs(net).toLocaleString()}` : '±0'}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-[#666] font-numeric tracking-wider">PAID: ¥{Math.round(b.paid).toLocaleString()}</p>
                    <p className="text-[10px] text-[#666] font-numeric tracking-wider">SHARE: ¥{Math.round(b.owes).toLocaleString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* ── Sticky Bottom Action ── */}
      <div className="sticky-bottom-action flex gap-3">
        <button onClick={handleShareLine}
          className="flex-1 py-4 rounded-xl bg-[#06C755] text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(6,199,85,0.3)] active:scale-95 transition-transform">
          LINEで送る
        </button>
        {'share' in navigator && (
          <button onClick={handleShareGeneric}
            className="flex-1 py-4 rounded-xl bank-surface text-white font-bold tracking-wide border border-[#333] hover:bg-[#222] active:scale-95 transition-all">
            共有する
          </button>
        )}
      </div>
    </div>
  )
}
