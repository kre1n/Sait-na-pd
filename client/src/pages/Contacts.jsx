import { useState, useEffect } from 'react'
import './Contacts.css'

export default function Contacts() {
  const [about, setAbout] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/about')
      .then(res => res.json())
      .then(data => {
        setAbout(data)
        setLoading(false)
      })
      .catch(() => {
        setAbout({
          title: 'Отдел охраны труда',
          description: 'Обеспечение безопасности и охраны здоровья работников предприятия',
          contacts: {
            phone: '+7 (XXX) XXX-XX-XX',
            email: 'ohrana@enterprise.ru',
            address: 'ул. Примерная, д. 1, каб. 101'
          }
        })
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="loading">Загрузка...</p>
  if (!about) return null

  const { contacts } = about

  return (
    <div className="contacts-page">
      <div className="page-header">
        <h1>Контакты</h1>
        <p>Отдел охраны труда — свяжитесь с нами</p>
      </div>

      <div className="contacts-grid">
        <div className="contact-card card">
          <div className="contact-icon">📞</div>
          <h3>Телефон</h3>
          <a href={`tel:${contacts?.phone}`}>{contacts?.phone || '—'}</a>
        </div>
        <div className="contact-card card">
          <div className="contact-icon">✉️</div>
          <h3>Email</h3>
          <a href={`mailto:${contacts?.email}`}>{contacts?.email || '—'}</a>
        </div>
        <div className="contact-card card">
          <div className="contact-icon">📍</div>
          <h3>Адрес</h3>
          <p>{contacts?.address || '—'}</p>
        </div>
      </div>

      <div className="contacts-info card">
        <h3>Режим работы</h3>
        <p>Понедельник — Пятница: 9:00 — 18:00</p>
        <p>Обед: 13:00 — 14:00</p>
      </div>
    </div>
  )
}
