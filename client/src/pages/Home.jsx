import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Охрана труда на предприятии</h1>
          <p className="hero-subtitle">
            Обеспечение безопасности и сохранение здоровья работников — наш главный приоритет
          </p>
          <div className="hero-actions">
            <Link to="/documents" className="btn btn-primary">Документы</Link>
            <Link to="/training" className="btn btn-outline">Обучение</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-cards">
            <div className="hero-card">
              <span className="hero-card-icon">📋</span>
              <span>Документация</span>
            </div>
            <div className="hero-card">
              <span className="hero-card-icon">📚</span>
              <span>Инструктажи</span>
            </div>
            <div className="hero-card">
              <span className="hero-card-icon">🦺</span>
              <span>СИЗ</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Направления работы</h2>
        <div className="features-grid">
          <Link to="/documents" className="feature-card card">
            <div className="feature-icon">📄</div>
            <h3>Нормативные документы</h3>
            <p>Инструкции, положения и регламенты по охране труда</p>
          </Link>
          <Link to="/training" className="feature-card card">
            <div className="feature-icon">🎓</div>
            <h3>Обучение и инструктажи</h3>
            <p>Вводный, первичный и повторные инструктажи по безопасности</p>
          </Link>
          <div className="feature-card card">
            <div className="feature-icon">⚠️</div>
            <h3>Опасные факторы</h3>
            <p>Идентификация и контроль производственных рисков</p>
          </div>
          <div className="feature-card card">
            <div className="feature-icon">🩺</div>
            <h3>Медосмотры</h3>
            <p>Предварительные и периодические осмотры работников</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content card">
          <h2>Есть вопросы по охране труда?</h2>
          <p>Свяжитесь с отделом охраны труда для консультации</p>
          <Link to="/contacts" className="btn btn-primary">Контакты</Link>
        </div>
      </section>
    </div>
  )
}
