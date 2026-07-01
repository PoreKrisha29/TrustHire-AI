import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: auto-refresh on 401 ────────────────────
let isRefreshing = false
let failedQueue  = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry   = true
      isRefreshing      = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data
        localStorage.setItem('accessToken',  accessToken)
        localStorage.setItem('refreshToken', newRefresh)
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
        processQueue(null, accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── API service objects ───────────────────────────────────────────

export const authApi = {
  register:      (data)  => api.post('/auth/register', data),
  login:         (data)  => api.post('/auth/login', data),
  logout:        ()      => api.post('/auth/logout'),
  refresh:       (data)  => api.post('/auth/refresh', data),
  verifyEmail:   (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword:(data)  => api.post('/auth/forgot-password', data),
  resetPassword: (data)  => api.post('/auth/reset-password', data),
  me:            ()      => api.get('/auth/me'),
}

export const jobsApi = {
  list:           (params) => api.get('/jobs', { params }),
  get:            (id)     => api.get(`/jobs/${id}`),
  create:         (data)   => api.post('/jobs', data),
  update:         (id, d)  => api.put(`/jobs/${id}`, d),
  delete:         (id)     => api.delete(`/jobs/${id}`),
  apply:          (id, d)  => api.post(`/jobs/${id}/apply`, d),
  withdraw:       (id)     => api.delete(`/jobs/${id}/apply`),
  applicants:     (id, p)  => api.get(`/jobs/${id}/applicants`, { params: p }),
  updateStatus:   (id, aid, d) => api.patch(`/jobs/${id}/applicants/${aid}/status`, d),
}

export const candidatesApi = {
  getProfile:     ()     => api.get('/candidates/me'),
  updateProfile:  (data) => api.put('/candidates/me', data),
  uploadResume:   (file) => {
    const form = new FormData()
    form.append('resume', file)
    return api.post('/candidates/me/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getAnalysis:    ()     => api.get('/candidates/me/resume/analysis'),
  getAnalysisStatus: ()  => api.get('/candidates/me/resume/analysis/status'),
  getApplications:(p)    => api.get('/candidates/me/applications', { params: p }),
  getMatches:     ()     => api.get('/candidates/me/matches'),
  getDashboard:   ()     => api.get('/candidates/me/dashboard'),
}

export const employersApi = {
  getProfile:     ()     => api.get('/employers/me'),
  updateProfile:  (data) => api.put('/employers/me', data),
  uploadLogo:     (file) => {
    const form = new FormData()
    form.append('logo', file)
    return api.post('/employers/me/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getListings:    (p)    => api.get('/employers/me/listings', { params: p }),
  getDashboard:   ()     => api.get('/employers/me/dashboard'),
}

export const companiesApi = {
  submitVerification: (data, file) => {
    const form = new FormData()
    form.append('document', file)
    Object.entries(data).forEach(([k, v]) => v && form.append(k, v))
    return api.post('/companies/me/verify', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getVerificationStatus: () => api.get('/companies/me/verify/status'),
  getPublicProfile:      (id) => api.get(`/companies/${id}`),
}

export const assistantApi = {
  chat:       (data)      => api.post('/assistant/chat', data),
  history:    (sessionId) => api.get('/assistant/history', { params: { sessionId } }),
  quota:      ()          => api.get('/assistant/quota'),
}

export const adminApi = {
  getStats:            ()       => api.get('/admin/stats'),
  getQuarantine:       (p)      => api.get('/admin/quarantine', { params: p }),
  actOnQuarantine:     (id, d)  => api.patch(`/admin/quarantine/${id}`, d),
  getVerifications:    (p)      => api.get('/admin/verifications', { params: p }),
  actOnVerification:   (id, d)  => api.patch(`/admin/verifications/${id}`, d),
  listUsers:           (p)      => api.get('/admin/users', { params: p }),
  getAuditLog:         (p)      => api.get('/admin/audit', { params: p }),
}

export default api
