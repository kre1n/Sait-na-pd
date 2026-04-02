import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authHeaders } from '../lib/apiHeaders'
import './Tests.css'

function Tests() {
  const [tests, setTests] = useState([])
  const [userResults, setUserResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    try {
      const testsResponse = await fetch('/api/tests', {
        headers: authHeaders()
      })
      
      if (testsResponse.ok) {
        const testsData = await testsResponse.json()
        setTests(testsData.tests)
      }
      
      // Загрузка результатов пользователя
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      if (userData.id) {
        const resultsResponse = await fetch(`/api/test-results/${userData.id}`, {
          headers: authHeaders()
        })
        
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json()
          setUserResults(resultsData.results)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTestStatus = (testId) => {
    const results = userResults.filter(r => r.testId === testId)
    if (results.length === 0) return 'not_started'
    
    const lastResult = results[results.length - 1]
    return lastResult.passed ? 'passed' : 'failed'
  }

  const getBestScore = (testId) => {
    const results = userResults.filter(r => r.testId === testId)
    if (results.length === 0) return null
    
    return Math.max(...results.map(r => r.score))
  }

  const getAttemptsCount = (testId) => {
    return userResults.filter(r => r.testId === testId).length
  }

  if (loading) {
    return (
      <div className="tests-loading">
        <div className="spinner"></div>
        <p>Загрузка тестов...</p>
      </div>
    )
  }

  return (
    <div className="tests">
      <div className="tests-header">
        <h1>Тесты по охране труда</h1>
        <p>Проверьте свои знания в области охраны труда</p>
      </div>

      <div className="tests-grid">
        {tests.map(test => {
          const status = getTestStatus(test.id)
          const bestScore = getBestScore(test.id)
          const attempts = getAttemptsCount(test.id)
          
          return (
            <div key={test.id} className={`test-card ${status}`}>
              <div className="test-header">
                <h3>{test.title}</h3>
                <span className={`test-status ${status}`}>
                  {status === 'passed' && '✓ Сдан'}
                  {status === 'failed' && '✗ Не сдан'}
                  {status === 'not_started' && '○ Не начат'}
                </span>
              </div>
              
              <p className="test-description">{test.description}</p>
              
              <div className="test-info">
                <div className="info-item">
                  <span className="info-label">Категория:</span>
                  <span className="info-value">{test.category}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Вопросов:</span>
                  <span className="info-value">{test.questions}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Проходной балл:</span>
                  <span className="info-value">{test.passingScore}%</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Время:</span>
                  <span className="info-value">{test.timeLimit} мин</span>
                </div>
              </div>

              {attempts > 0 && (
                <div className="test-progress">
                  <div className="progress-info">
                    <span>Попыток: {attempts}</span>
                    {bestScore && <span>Лучший результат: {bestScore}%</span>}
                  </div>
                </div>
              )}

              <div className="test-actions">
                <Link to={`/test/${test.id}`} className="test-button">
                  {status === 'not_started' ? 'Начать тест' : 'Пересдать'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {tests.length === 0 && (
        <div className="empty-tests">
          <h3>Тесты пока не добавлены</h3>
          <p>Загляните позже - здесь появятся тесты по охране труда</p>
        </div>
      )}
    </div>
  )
}

export default Tests
