import { useState, useEffect } from 'react'
import './Training.css'

export default function Training() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/training')
      .then(res => res.json())
      .then(data => {
        setTypes(data.types || [])
        setLoading(false)
      })
      .catch(() => {
        setTypes([
          { id: 1, name: 'Вводный инструктаж', description: 'Проводится при приеме на работу', frequency: 'Один раз при приеме' },
          { id: 2, name: 'Первичный инструктаж', description: 'На рабочем месте перед началом работы', frequency: 'При приеме на работу' },
        ])
        setLoading(false)
      })
  }, [])

  return (
    <div className="training-page">
      <div className="page-header">
        <h1>Обучение и инструктажи</h1>
        <p>Виды инструктажей и порядок их проведения</p>
      </div>

      {loading ? (
        <p className="loading">Загрузка...</p>
      ) : (
        <div className="training-list">
          {types.map((item, index) => (
            <div key={item.id} className="training-card card">
              <div className="training-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="training-content">
                <h3>{item.name}</h3>
                <p className="training-desc">{item.description}</p>
                <div className="training-frequency">
                  <strong>Периодичность:</strong> {item.frequency}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="training-info card">
        <h3>Запись на обучение</h3>
        <p>Для записи на обучение по охране труда обращайтесь в отдел кадров или напрямую в отдел охраны труда.</p>
      </div>
    </div>
  )
}
