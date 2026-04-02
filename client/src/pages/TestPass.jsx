import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authHeaders } from '../lib/apiHeaders'
import './TestPass.css'

function TestPass() {
  const { testId } = useParams()
  const navigate = useNavigate()
  
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [startTime] = useState(() => Date.now())

  const submitLockRef = useRef(false)
  const handleSubmitRef = useRef(async () => {})
  const answersRef = useRef({})

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    submitLockRef.current = false
  }, [testId])

  const fetchTestQuestions = async () => {
    setLoading(true)
    setTimeLeft(null)
    setAnswers({})
    setCurrentQuestion(0)
    try {
      const testsResponse = await fetch('/api/tests', {
        headers: authHeaders()
      })
      
      if (testsResponse.ok) {
        const testsData = await testsResponse.json()
        const tid = Number(testId)
        const currentTest = testsData.tests.find(t => Number(t.id) === tid)
        setTest(currentTest)
        const mins = Number(currentTest?.timeLimit)
        const seconds = Number.isFinite(mins) && mins > 0 ? Math.floor(mins * 60) : 30 * 60
        setTimeLeft(seconds)
      }
      
      const questionsResponse = await fetch(`/api/test-questions/${testId}`, {
        headers: authHeaders()
      })
      
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json()
        const list = Array.isArray(questionsData.questions) ? questionsData.questions : []
        setQuestions(list)
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestQuestions()
  }, [testId])

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)

    try {
      const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 60000))
      const payload = { answers: answersRef.current }

      const response = await fetch(`/api/test-check/${testId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const resultsData = await response.json()
        setResults(resultsData)
        setShowResults(true)

        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        await fetch('/api/test-results', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            userId: userData.id,
            testId: Number(testId),
            score: resultsData.score,
            timeSpent
          })
        })
      } else {
        submitLockRef.current = false
      }
    } catch (error) {
      console.error('Ошибка отправки ответов:', error)
      submitLockRef.current = false
    } finally {
      setSubmitting(false)
    }
  }, [testId, startTime])

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  useEffect(() => {
    if (loading || showResults || submitting || timeLeft === null || timeLeft <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) return prev
        if (prev <= 1) {
          handleSubmitRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [loading, showResults, submitting, timeLeft === null, testId])

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleMultipleChoiceChange = (questionId, optionIndex, isChecked) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionId] || []
      if (isChecked) {
        return {
          ...prev,
          [questionId]: [...currentAnswers, optionIndex]
        }
      } else {
        return {
          ...prev,
          [questionId]: currentAnswers.filter(idx => idx !== optionIndex)
        }
      }
    })
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleExitTest = () => {
    if (window.confirm('Вы уверены, что хотите прервать прохождение теста?')) {
      navigate('/tests')
    }
  }

  const formatTime = (seconds) => {
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
      return '—:—'
    }
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    if (!questions.length) return 0
    const answered = Object.keys(answers).length
    return Math.round((answered / questions.length) * 100)
  }

  if (loading) {
    return (
      <div className="test-loading">
        <div className="spinner"></div>
        <p>Загрузка теста...</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="test-error">
        <h3>Тест не найден</h3>
        <p>Запрошенный тест не существует или был удален</p>
        <button onClick={() => navigate('/tests')} className="back-button">
          Вернуться к тестам
        </button>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="test-error">
        <h3>Нет вопросов</h3>
        <p>Для этого теста не загружены вопросы</p>
        <button type="button" onClick={() => navigate('/tests')} className="back-button">
          Вернуться к тестам
        </button>
      </div>
    )
  }

  if (showResults && results) {
    return (
      <div className="test-results">
        <div className="results-header">
          <h2>Результаты теста</h2>
          <div className={`score-badge ${results.passed ? 'passed' : 'failed'}`}>
            {results.score}% {results.passed ? '✓ Сдано' : '✗ Не сдано'}
          </div>
        </div>
        
        <div className="results-stats">
          <div className="stat-item">
            <span className="stat-label">Правильных ответов:</span>
            <span className="stat-value">{results.correctCount} из {results.totalQuestions}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Проходной балл:</span>
            <span className="stat-value">{results.passingScore}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Время выполнения:</span>
            <span className="stat-value">{Math.round((Date.now() - startTime) / 60000)} минут</span>
          </div>
        </div>

        <div className="answers-review">
          <h3>Детальные ответы</h3>
          {results.results.map((result, index) => (
            <div key={result.questionId} className={`answer-item ${result.isCorrect ? 'correct' : 'incorrect'}`}>
              <div className="answer-header">
                <span className="question-number">Вопрос {index + 1}</span>
                <span className={`answer-status ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                  {result.isCorrect ? '✓' : '✗'}
                </span>
              </div>
              <p className="question-text">{result.question}</p>
              <div className="answer-details">
                <div className="user-answer">
                  <strong>Ваш ответ:</strong> {Array.isArray(result.userAnswer) ? result.userAnswer.join(', ') : result.userAnswer}
                </div>
                <div className="correct-answer">
                  <strong>Правильный ответ:</strong> {Array.isArray(result.correctAnswer) ? result.correctAnswer.join(', ') : result.correctAnswer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="results-actions">
          <button onClick={() => navigate('/tests')} className="back-button">
            Вернуться к тестам
          </button>
          <button onClick={() => navigate('/profile')} className="profile-button">
            Личный кабинет
          </button>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="test-pass">
      <div className="test-header">
        <div className="test-info">
          <h2>{test.title}</h2>
          <p>Вопрос {currentQuestion + 1} из {questions.length}</p>
        </div>
        <div className="test-header-right">
          <div className="test-timer">
            <span className={`timer ${timeLeft != null && timeLeft < 300 ? 'warning' : ''}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>
          <button type="button" className="test-exit-btn" onClick={handleExitTest}>
            Прервать тест
          </button>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${getProgress()}%` }}></div>
      </div>

      <div className="question-card">
        <h3 className="question-text">{question.question}</h3>
        
        <div className="options">
          {question.options.map((option, index) => (
            <label key={index} className="option-label">
              {question.type === 'single' ? (
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={index}
                  checked={answers[question.id] === index}
                  onChange={() => handleAnswerChange(question.id, index)}
                  className="option-input"
                />
              ) : (
                <input
                  type="checkbox"
                  checked={(answers[question.id] || []).includes(index)}
                  onChange={(e) => handleMultipleChoiceChange(question.id, index, e.target.checked)}
                  className="option-input"
                />
              )}
              <span className="option-text">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="test-navigation">
        <button 
          onClick={handlePrevious} 
          disabled={currentQuestion === 0}
          className="nav-button prev"
        >
          ← Назад
        </button>
        
        <div className="question-indicators">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`indicator ${index === currentQuestion ? 'active' : ''} ${answers[questions[index].id] ? 'answered' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        {currentQuestion === questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-button"
          >
            {submitting ? 'Отправка...' : 'Завершить тест'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="nav-button next"
          >
            Далее →
          </button>
        )}
      </div>
    </div>
  )
}

export default TestPass