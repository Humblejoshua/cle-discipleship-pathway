const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
    signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    forgotPassword: (login) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ login }) }),
    resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  },
  series: {
    list: () => request('/series'),
    get: (id) => request(`/series/${id}`),
    create: (data) => request('/series', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/series/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/series/${id}`, { method: 'DELETE' }),
  },
  classes: {
    list: (seriesId) => request(`/classes/series/${seriesId}`),
    get: (id) => request(`/classes/${id}`),
    create: (data) => {
      if (data instanceof FormData) {
        return request('/classes', { method: 'POST', body: data });
      }
      return request('/classes', { method: 'POST', body: JSON.stringify(data) });
    },
    update: (id, data) => {
      if (data instanceof FormData) {
        return request(`/classes/${id}`, { method: 'PUT', body: data });
      }
      return request(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete: (id) => request(`/classes/${id}`, { method: 'DELETE' }),
  },
  tests: {
    getQuestions: (classId) => request(`/tests/${classId}`),
    submit: (classId, answers) => request(`/tests/${classId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
    getResult: (classId) => request(`/tests/${classId}/result`),
    getStatus: (classId) => request(`/tests/${classId}/status`),
  },
  progress: {
    pathway: () => request('/progress/pathway'),
    markRead: (classId) => request(`/progress/class/${classId}/read`, { method: 'POST' }),
    milestones: () => request('/progress/milestones'),
    certificates: () => request('/progress/certificates'),
    stats: () => request('/progress/stats'),
  },
  reports: {
    disciples: () => request('/reports/disciples'),
    series: () => request('/reports/series'),
    overview: () => request('/reports/overview'),
  },
  certificates: {
    list: () => request('/certificates'),
    download: (id) => `${API_BASE}/certificates/${id}/download`,
  },
};
