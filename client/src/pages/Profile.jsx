import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { authHeaders } from '../lib/apiHeaders'
import './Profile.css'

function Profile() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stats')
  const [noUser, setNoUser] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      setNoUser(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const statsResponse = await fetch(`/api/user-stats/${user.id}`, {
        headers: authHeaders()
      })
      
      const resultsResponse = await fetch(`/api/test-results/${user.id}`, {
        headers: authHeaders()
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }
      
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json()
        setResults(resultsData.results)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    )
  }

  if (noUser) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Личный кабинет</h1>
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Статистика
        </button>
        <button 
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📝 Результаты тестов
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'stats' && stats && (
          <div className="stats-section">
            <h3>Ваша статистика</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalTests}</div>
                <div className="stat-label">Всего тестов</div>
              </div>
              <div className="stat-card success">
                <div className="stat-number">{stats.passedTests}</div>
                <div className="stat-label">Сдано</div>
              </div>
              <div className="stat-card error">
                <div className="stat-number">{stats.failedTests}</div>
                <div className="stat-label">Не сдано</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.averageScore}%</div>
                <div className="stat-label">Средний балл</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.passRate}%</div>
                <div className="stat-label">Процент сдачи</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalTimeSpent} мин</div>
                <div className="stat-label">Общее время</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-section">
            <h3>История тестов</h3>
            {results.length === 0 ? (
              <div className="empty-results">
                <p>Вы еще не проходили тесты</p>
              </div>
            ) : (
              <div className="results-list">
                {results.map(result => (
                  <div key={result.id} className={`result-card ${result.passed ? 'passed' : 'failed'}`}>
                    <div className="result-header">
                      <h4>{result.test?.title}</h4>
                      <span className={`result-status ${result.passed ? 'success' : 'error'}`}>
                        {result.passed ? '✓ Сдано' : '✗ Не сдано'}
                      </span>
                    </div>
                    <div className="result-details">
                      <div className="result-score">
                        <span className="score-label">Результат:</span>
                        <span className="score-value">{result.score}%</span>
                      </div>
                      <div className="result-time">
                        <span className="time-label">Время:</span>
                        <span className="time-value">{result.timeSpent} минут</span>
                      </div>
                      <div className="result-date">
                        <span className="date-label">Дата:</span>
                        <span className="date-value">{formatDate(result.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
