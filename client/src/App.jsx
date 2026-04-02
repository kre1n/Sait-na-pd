import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Home from './pages/Home'
import Documents from './pages/Documents'
import Training from './pages/Training'
import Contacts from './pages/Contacts'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Tests from './pages/Tests'
import TestPass from './pages/TestPass'
import Admin from './pages/Admin'
import AdminGuard from './components/AdminGuard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={
        <AuthGuard>
          <Layout>
            <Home />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/documents" element={
        <AuthGuard>
          <Layout>
            <Documents />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/training" element={
        <AuthGuard>
          <Layout>
            <Training />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/contacts" element={
        <AuthGuard>
          <Layout>
            <Contacts />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/profile" element={
        <AuthGuard>
          <Layout>
            <Profile />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/tests" element={
        <AuthGuard>
          <Layout>
            <Tests />
          </Layout>
        </AuthGuard>
      } />
      <Route path="/test/:testId" element={
        <AuthGuard>
          <TestPass />
        </AuthGuard>
      } />
      <Route path="/admin" element={
        <AuthGuard>
          <AdminGuard>
            <Layout>
              <Admin />
            </Layout>
          </AdminGuard>
        </AuthGuard>
      } />
    </Routes>
  )
}

export default App
