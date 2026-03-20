const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const UPLOAD_BASE = import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace('/api', '') : '';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  
  const response = await fetch(`${API_BASE}${url}`, config);
  
  if (response.status === 204) return null;
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'エラーが発生しました');
  }
  
  return data;
}

export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${UPLOAD_BASE}${path}`;
}

export const api = {
  // Events
  getEvents: () => request('/events'),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (name, image_url) => request('/events', { method: 'POST', body: JSON.stringify({ name, image_url }) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (eventId) => request(`/events/${eventId}/members`),
  addMember: (eventId, name) => request(`/events/${eventId}/members`, { method: 'POST', body: JSON.stringify({ name }) }),
  updateMember: (eventId, id, name) => request(`/events/${eventId}/members/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteMember: (eventId, id) => request(`/events/${eventId}/members/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: (eventId) => request(`/events/${eventId}/payments`),
  addPayment: (eventId, data) => request(`/events/${eventId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (eventId, id, data) => request(`/events/${eventId}/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (eventId, id) => request(`/events/${eventId}/payments/${id}`, { method: 'DELETE' }),

  // Settlement
  getSettlement: (eventId) => request(`/events/${eventId}/settlement`),

  // Upload
  uploadImage: (base64Data) => request('/upload', { method: 'POST', body: JSON.stringify({ image: base64Data }) }),
};
