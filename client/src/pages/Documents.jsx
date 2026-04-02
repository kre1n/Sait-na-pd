import { useState, useEffect } from 'react'
import './Documents.css'

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setDocuments(data.documents || [])
        setLoading(false)
      })
      .catch(() => {
        setDocuments([
          { id: 1, title: 'Положение о системе управления охраной труда', category: 'Политика', date: '2024-01-15' },
          { id: 2, title: 'Инструкция по пожарной безопасности', category: 'Инструкции', date: '2024-02-20' },
          { id: 3, title: 'Правила внутреннего трудового распорядка', category: 'Нормативы', date: '2024-01-10' },
        ])
        setLoading(false)
      })
  }, [])

  const categories = ['all', ...new Set(documents.map(d => d.category))]
  const filtered = filter === 'all' 
    ? documents 
    : documents.filter(d => d.category === filter)

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Документы по охране труда</h1>
        <p>Нормативные документы, инструкции и регламенты</p>
      </div>

      <div className="documents-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? 'Все' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading">Загрузка...</p>
      ) : (
        <div className="documents-list">
          {filtered.map(doc => (
            <div key={doc.id} className="document-card card">
              <div className="document-category">{doc.category}</div>
              <h3 className="document-title">{doc.title}</h3>
              <div className="document-meta">
                <span>Дата: {doc.date}</span>
              </div>
              {doc.filePath ? (
                <a
                  className="btn btn-outline btn-sm"
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Скачать
                </a>
              ) : (
                <button type="button" className="btn btn-outline btn-sm" disabled>
                  Файл не прикреплён
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
