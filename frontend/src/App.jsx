import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EventDashboard from './pages/EventDashboard'
import PaymentForm from './pages/PaymentForm'
import SettlementResult from './pages/SettlementResult'

function App() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:eventId" element={<EventDashboard />} />
        <Route path="/events/:eventId/payments/new" element={<PaymentForm />} />
        <Route path="/events/:eventId/payments/:paymentId/edit" element={<PaymentForm />} />
        <Route path="/events/:eventId/settlement" element={<SettlementResult />} />
      </Routes>
    </div>
  )
}

export default App
