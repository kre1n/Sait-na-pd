export function authHeaders() {
  const token = localStorage.getItem('token')
  const raw = localStorage.getItem('user')
  let userId = ''
  try {
    if (raw) userId = String(JSON.parse(raw).id ?? '')
  } catch {
    userId = ''
  }
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
  if (userId) h['X-User-Id'] = userId
  return h
}

export function authHeadersMultipart() {
  const token = localStorage.getItem('token')
  const raw = localStorage.getItem('user')
  let userId = ''
  try {
    if (raw) userId = String(JSON.parse(raw).id ?? '')
  } catch {
    userId = ''
  }
  const h = { Authorization: `Bearer ${token}` }
  if (userId) h['X-User-Id'] = userId
  return h
}
