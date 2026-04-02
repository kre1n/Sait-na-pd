import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Layout.css'

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      setUser(null)
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/home" className="logo">
            <span className="logo-icon">🛡️</span>
            <span>Мосполитех</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/home" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Главная
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Документы
            </NavLink>
            <NavLink to="/training" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Обучение
            </NavLink>
            <NavLink to="/tests" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Тесты
            </NavLink>
            <NavLink to="/contacts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Контакты
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Личный кабинет
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Админ
              </NavLink>
            )}
          </nav>
          <div className="user-menu">
            {user ? (
              <>
                <span className="user-name">{user.name}</span>
                <button onClick={handleLogout} className="logout-button">
                  Выйти
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <p>© {new Date().getFullYear()} Охрана труда. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}
