import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      try {
        const rawUser = localStorage.getItem('user')
        let userId = ''
        try {
          if (rawUser) userId = String(JSON.parse(rawUser).id ?? '')
        } catch {
          userId = ''
        }
        const response = await fetch('/api/auth/check', {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...(userId ? { 'X-User-Id': userId } : {})
          }
        })

        if (response.ok) {
          try {
            const data = await response.json()
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user))
            }
          } catch {
            /* ignore */
          }
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setIsAuthenticated(false)
        }
      } catch (error) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      Загрузка...
    </div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AuthGuard
