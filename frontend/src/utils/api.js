import { supabase } from './supabaseClient'

export const api = {
  // --- Events ---
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*, members(*), payments(*, splits:payment_splits(*))')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getEvent(id) {
    const { data, error } = await supabase
      .from('events')
      .select('*, members(*), payments(*, splits:payment_splits(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createEvent(name, members, imageUrl = '') {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({ name, image_url: imageUrl })
      .select().single()
    if (eventError) throw eventError

    if (members && members.length > 0) {
      await supabase.from('members')
        .insert(members.map(m => ({ event_id: event.id, name: m })))
    }
    return event
  },

  async updateEvent(id, data) {
    const { data: event, error } = await supabase
      .from('events')
      .update({ name: data.name, image_url: data.image_url })
      .eq('id', id)
      .select().single()
    if (error) throw error
    return event
  },

  async deleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
  },

  // --- Members ---
  async getMembers(eventId) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('event_id', eventId)
    if (error) throw error
    return data
  },

  async addMember(eventId, name) {
    const { data, error } = await supabase
      .from('members')
      .insert({ event_id: eventId, name })
      .select().single()
    if (error) throw error
    return data
  },

  async updateMember(eventId, id, name) {
    const { data, error } = await supabase
      .from('members')
      .update({ name })
      .eq('id', id)
      .select().single()
    if (error) throw error
    return data
  },

  async deleteMember(eventId, id) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // --- Payments ---
  async addPayment(eventId, data) {
    const { data: payment, error: pError } = await supabase
      .from('payments')
      .insert({
        event_id: eventId,
        payer_id: data.payer_id,
        amount: data.amount,
        category: data.category,
        memo: data.memo
      })
      .select().single()
    if (pError) throw pError

    if (data.splits && data.splits.length > 0) {
      await supabase.from('payment_splits')
        .insert(data.splits.map(s => ({
          payment_id: payment.id,
          member_id: s.member_id,
          ratio: s.ratio
        })))
    }
    return payment
  },

  async updatePayment(eventId, paymentId, data) {
    const { error: pError } = await supabase
      .from('payments')
      .update({
        payer_id: data.payer_id,
        amount: data.amount,
        category: data.category,
        memo: data.memo
      })
      .eq('id', paymentId)
    if (pError) throw pError

    await supabase.from('payment_splits').delete().eq('payment_id', paymentId)
    if (data.splits && data.splits.length > 0) {
      await supabase.from('payment_splits')
        .insert(data.splits.map(s => ({
          payment_id: paymentId,
          member_id: s.member_id,
          ratio: s.ratio
        })))
    }
  },

  async deletePayment(eventId, id) {
    await supabase.from('payments').delete().eq('id', id)
  },

  // --- Settlement ---
  async getSettlement(eventId) {
    const res = await fetch(`/api/events/${eventId}/settlement`)
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to fetch settlement data')
    }
    return res.json()
  },

  // --- Media ---
  async uploadImage(base64) {
    const res = await fetch(base64)
    const blob = await res.blob()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
    const { data, error } = await supabase.storage.from('covers').upload(fileName, blob, { contentType: 'image/jpeg' })
    if (error) throw error
    return { url: data.path }
  }
}

export function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('covers').getPublicUrl(path)
  return data.publicUrl
}
