import { Navigate } from 'react-router-dom'

function AdminGuard({ children }) {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return <Navigate to="/" replace />
    const user = JSON.parse(raw)
    if (user.role !== 'admin') {
      return <Navigate to="/home" replace />
    }
    return children
  } catch {
    return <Navigate to="/" replace />
  }
}

export default AdminGuard
