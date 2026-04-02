import { useState, useEffect } from 'react'
import { authHeaders, authHeadersMultipart } from '../lib/apiHeaders'
import './Admin.css'

function makeQuestion(i) {
  return {
    id: i + 1,
    question: `Вопрос ${i + 1}`,
    type: 'single',
    options: ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г'],
    correctAnswer: 0
  }
}

export default function Admin() {
  const [tab, setTab] = useState('tests')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tests, setTests] = useState([])
  const [documents, setDocuments] = useState([])
  const [trainings, setTrainings] = useState([])

  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    category: '',
    passingScore: 70,
    timeLimit: 30
  })

  const [questionsCount, setQuestionsCount] = useState(2)
  const [questions, setQuestions] = useState([makeQuestion(0), makeQuestion(1)])

  const [docForm, setDocForm] = useState({
    title: '',
    category: '',
    doc_date: new Date().toISOString().slice(0, 10),
    file: null
  })

  const [trainForm, setTrainForm] = useState({
    name: '',
    description: '',
    frequency: ''
  })

  const loadLists = async () => {
    try {
      const [t, d, tr] = await Promise.all([
        fetch('/api/tests', { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/training').then(r => r.json())
      ])
      setTests(t.tests || [])
      setDocuments(d.documents || [])
      setTrainings(tr.types || [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  const showOk = msg => {
    setMessage(msg)
    setError('')
    setTimeout(() => setMessage(''), 4000)
  }

  const setCountAndResize = value => {
    const nextCount = Math.max(1, Math.min(200, Number(value) || 1))
    setQuestionsCount(nextCount)
    setQuestions(prev => {
      const next = prev.slice(0, nextCount)
      while (next.length < nextCount) next.push(makeQuestion(next.length))
      return next.map((q, idx) => ({ ...q, id: idx + 1 }))
    })
  }

  const updateQuestion = (idx, patch) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch, id: i + 1 } : q)))
  }

  const addOption = idx => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== idx) return q
        const nextOptions = [...(q.options || []), `Вариант ${String.fromCharCode(65 + (q.options?.length || 0))}`]
        return { ...q, options: nextOptions }
      })
    )
  }

  const removeOption = (qIdx, optIdx) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const opts = [...(q.options || [])]
        opts.splice(optIdx, 1)

        let nextCorrect = q.correctAnswer
        if (q.type === 'single') {
          const ca = Number(nextCorrect)
          if (!Number.isFinite(ca)) nextCorrect = 0
          else if (ca === optIdx) nextCorrect = 0
          else if (ca > optIdx) nextCorrect = ca - 1
        } else if (q.type === 'multiple') {
          const arr = Array.isArray(nextCorrect) ? nextCorrect : []
          nextCorrect = arr
            .filter(v => Number.isFinite(Number(v)))
            .map(v => Number(v))
            .filter(v => v !== optIdx)
            .map(v => (v > optIdx ? v - 1 : v))
        }

        return { ...q, options: opts, correctAnswer: nextCorrect }
      })
    )
  }

  const toggleMultipleCorrect = (qIdx, optIdx) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const cur = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(Number).filter(Number.isFinite) : []
        const has = cur.includes(optIdx)
        const next = has ? cur.filter(v => v !== optIdx) : [...cur, optIdx].sort((a, b) => a - b)
        return { ...q, correctAnswer: next }
      })
    )
  }

  const validateQuestions = qs => {
    if (!Array.isArray(qs) || qs.length === 0) return 'Добавьте хотя бы один вопрос'
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]
      const title = String(q.question || '').trim()
      if (!title) return `Вопрос ${i + 1}: заполните текст вопроса`
      const type = q.type
      if (type !== 'single' && type !== 'multiple') return `Вопрос ${i + 1}: неизвестный тип`
      const opts = Array.isArray(q.options) ? q.options.map(v => String(v || '').trim()).filter(Boolean) : []
      if (opts.length < 2) return `Вопрос ${i + 1}: нужно минимум 2 варианта ответа`
      if (type === 'single') {
        const ca = Number(q.correctAnswer)
        if (!Number.isInteger(ca) || ca < 0 || ca >= opts.length) return `Вопрос ${i + 1}: выберите правильный ответ`
      }
      if (type === 'multiple') {
        const ca = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(Number).filter(Number.isFinite) : []
        const uniq = Array.from(new Set(ca))
        const ok = uniq.length > 0 && uniq.every(v => Number.isInteger(v) && v >= 0 && v < opts.length)
        if (!ok) return `Вопрос ${i + 1}: отметьте хотя бы один правильный вариант`
      }
    }
    return null
  }

  const submitTest = async e => {
    e.preventDefault()
    setError('')
    const vErr = validateQuestions(questions)
    if (vErr) {
      setError(vErr)
      return
    }
    const res = await fetch('/api/admin/tests', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: testForm.title,
        description: testForm.description,
        category: testForm.category,
        passingScore: Number(testForm.passingScore),
        timeLimit: Number(testForm.timeLimit),
        questions
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Ошибка сохранения теста')
      return
    }
    showOk('Тест добавлен')
    setTestForm({
      title: '',
      description: '',
      category: '',
      passingScore: 70,
      timeLimit: 30
    })
    setCountAndResize(2)
    loadLists()
  }

  const deleteTest = async id => {
    if (!window.confirm('Удалить тест и связанные результаты?')) return
    const res = await fetch(`/api/admin/tests/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      showOk('Тест удалён')
      loadLists()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Не удалось удалить')
    }
  }

  const submitDoc = async e => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('title', docForm.title)
    fd.append('category', docForm.category)
    fd.append('doc_date', docForm.doc_date)
    if (docForm.file) fd.append('file', docForm.file)
    const res = await fetch('/api/admin/documents', {
      method: 'POST',
      headers: authHeadersMultipart(),
      body: fd
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Ошибка загрузки')
      return
    }
    showOk('Документ добавлен')
    setDocForm({
      title: '',
      category: '',
      doc_date: new Date().toISOString().slice(0, 10),
      file: null
    })
    loadLists()
  }

  const deleteDoc = async id => {
    if (!window.confirm('Удалить документ?')) return
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      showOk('Документ удалён')
      loadLists()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Ошибка')
    }
  }

  const submitTrain = async e => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/trainings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(trainForm)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Ошибка')
      return
    }
    showOk('Запись об обучении добавлена')
    setTrainForm({ name: '', description: '', frequency: '' })
    loadLists()
  }

  const deleteTrain = async id => {
    if (!window.confirm('Удалить запись?')) return
    const res = await fetch(`/api/admin/trainings/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      showOk('Удалено')
      loadLists()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Ошибка')
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Панель администратора</h1>
        <p>Тесты, документы и обучение</p>
      </div>

      {message && <div className="admin-flash ok">{message}</div>}
      {error && <div className="admin-flash err">{error}</div>}

      <div className="admin-tabs">
        <button type="button" className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}>
          Тесты
        </button>
        <button type="button" className={tab === 'docs' ? 'active' : ''} onClick={() => setTab('docs')}>
          Документы
        </button>
        <button type="button" className={tab === 'train' ? 'active' : ''} onClick={() => setTab('train')}>
          Обучение
        </button>
      </div>

      {tab === 'tests' && (
        <div className="admin-section card">
          <h2>Новый тест</h2>
          <form onSubmit={submitTest} className="admin-form">
            <label>
              Название
              <input
                value={testForm.title}
                onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                required
              />
            </label>
            <label>
              Описание
              <textarea
                value={testForm.description}
                onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                rows={2}
              />
            </label>
            <label>
              Категория
              <input
                value={testForm.category}
                onChange={e => setTestForm({ ...testForm, category: e.target.value })}
              />
            </label>
            <div className="admin-row">
              <label>
                Проходной балл, %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={testForm.passingScore}
                  onChange={e => setTestForm({ ...testForm, passingScore: e.target.value })}
                />
              </label>
              <label>
                Лимит времени, мин
                <input
                  type="number"
                  min={1}
                  value={testForm.timeLimit}
                  onChange={e => setTestForm({ ...testForm, timeLimit: e.target.value })}
                />
              </label>
            </div>
            <div className="admin-qbuilder">
              <div className="admin-row">
                <label>
                  Количество вопросов
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={questionsCount}
                    onChange={e => setCountAndResize(e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-qbuilder-list">
                {questions.map((q, qIdx) => (
                  <div className="admin-question card" key={q.id}>
                    <div className="admin-question-head">
                      <div className="admin-question-title">Вопрос {qIdx + 1}</div>
                      <label className="admin-inline">
                        Тип
                        <select
                          value={q.type}
                          onChange={e => {
                            const nextType = e.target.value
                            updateQuestion(qIdx, {
                              type: nextType,
                              correctAnswer: nextType === 'multiple' ? [] : 0
                            })
                          }}
                        >
                          <option value="single">Один правильный</option>
                          <option value="multiple">Несколько правильных</option>
                        </select>
                      </label>
                    </div>

                    <label>
                      Текст вопроса
                      <input
                        value={q.question}
                        onChange={e => updateQuestion(qIdx, { question: e.target.value })}
                        required
                      />
                    </label>

                    <div className="admin-options">
                      <div className="admin-options-head">
                        <div>Варианты ответа</div>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => addOption(qIdx)}>
                          + Добавить вариант
                        </button>
                      </div>

                      {(q.options || []).map((opt, optIdx) => (
                        <div className="admin-option-row" key={optIdx}>
                          {q.type === 'single' ? (
                            <input
                              type="radio"
                              name={`q-${q.id}-correct`}
                              checked={Number(q.correctAnswer) === optIdx}
                              onChange={() => updateQuestion(qIdx, { correctAnswer: optIdx })}
                              title="Правильный ответ"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIdx)}
                              onChange={() => toggleMultipleCorrect(qIdx, optIdx)}
                              title="Правильный ответ"
                            />
                          )}

                          <input
                            value={opt}
                            onChange={e => {
                              const next = [...(q.options || [])]
                              next[optIdx] = e.target.value
                              updateQuestion(qIdx, { options: next })
                            }}
                            placeholder={`Вариант ${optIdx + 1}`}
                          />
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => removeOption(qIdx, optIdx)}
                            disabled={(q.options || []).length <= 2}
                            title="Удалить вариант"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Сохранить тест
            </button>
          </form>

          <h3>Существующие тесты</h3>
          <ul className="admin-list">
            {tests.map(t => (
              <li key={t.id}>
                <span>
                  #{t.id} — {t.title}
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => deleteTest(t.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'docs' && (
        <div className="admin-section card">
          <h2>Загрузить документ</h2>
          <form onSubmit={submitDoc} className="admin-form">
            <label>
              Название
              <input
                value={docForm.title}
                onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                required
              />
            </label>
            <label>
              Категория
              <input
                value={docForm.category}
                onChange={e => setDocForm({ ...docForm, category: e.target.value })}
                required
              />
            </label>
            <label>
              Дата документа
              <input
                type="date"
                value={docForm.doc_date}
                onChange={e => setDocForm({ ...docForm, doc_date: e.target.value })}
                required
              />
            </label>
            <label>
              Файл (PDF, DOCX и т.д.)
              <input
                type="file"
                onChange={e => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Добавить
            </button>
          </form>

          <h3>Список документов</h3>
          <ul className="admin-list">
            {documents.map(d => (
              <li key={d.id}>
                <span>
                  {d.title} ({d.category})
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => deleteDoc(d.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'train' && (
        <div className="admin-section card">
          <h2>Новая запись об обучении</h2>
          <form onSubmit={submitTrain} className="admin-form">
            <label>
              Название
              <input
                value={trainForm.name}
                onChange={e => setTrainForm({ ...trainForm, name: e.target.value })}
                required
              />
            </label>
            <label>
              Описание
              <textarea
                value={trainForm.description}
                onChange={e => setTrainForm({ ...trainForm, description: e.target.value })}
                rows={3}
              />
            </label>
            <label>
              Периодичность
              <input
                value={trainForm.frequency}
                onChange={e => setTrainForm({ ...trainForm, frequency: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Добавить
            </button>
          </form>

          <h3>Список</h3>
          <ul className="admin-list">
            {trainings.map(t => (
              <li key={t.id}>
                <span>{t.name}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => deleteTrain(t.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
