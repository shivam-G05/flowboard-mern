import { api } from './api.js';

// One function per REST endpoint. Components never build URLs themselves.

export const authApi = {
  me: () => api.get('/auth/me').then((r) => r.data.user),
  login: (body) => api.post('/auth/login', body).then((r) => r.data.user),
  register: (body) => api.post('/auth/register', body).then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (body) => api.post('/auth/forgot-password', body).then((r) => r.data),
  resetPassword: (body) => api.post('/auth/reset-password', body).then((r) => r.data),
};

export const tasksApi = {
  list: (params, signal) => api.get('/tasks', { params, signal }), // { data, meta.pagination }
  get: (id) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (body) => api.post('/tasks', body).then((r) => r.data),
  update: (id, body) => api.patch(`/tasks/${id}`, body).then((r) => r.data),
  move: (id, body) => api.patch(`/tasks/${id}/move`, body).then((r) => r.data),
  complete: (id) => api.post(`/tasks/${id}/complete`).then((r) => r.data),
  duplicate: (id) => api.post(`/tasks/${id}/duplicate`).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
  bulkUpdate: (body) => api.patch('/tasks/bulk', body).then((r) => r.data),
  bulkDelete: (ids) => api.post('/tasks/bulk-delete', { ids }).then((r) => r.data),
  activity: (id) => api.get(`/tasks/${id}/activity`).then((r) => r.data),
};

export const workflowApi = {
  get: () => api.get('/workflow').then((r) => r.data),
  stats: () => api.get('/workflow/stats').then((r) => r.data),
  addStage: (body) => api.post('/workflow/stages', body).then((r) => r.data),
  updateStage: (id, body) => api.patch(`/workflow/stages/${id}`, body).then((r) => r.data),
  reorder: (stageIds) => api.put('/workflow/stages/order', { stageIds }).then((r) => r.data),
  deleteStage: (id, moveTo) => api.delete(`/workflow/stages/${id}`, { params: { moveTo } }),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary', { params: { tzOffset: -new Date().getTimezoneOffset() } }).then((r) => r.data),
};
