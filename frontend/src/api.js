import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

export const getYears = () => api.get('/questions/years').then(r => r.data)
export const getQuestions = (params) => api.get('/questions', { params }).then(r => r.data)
export const getQuestion = (id) => api.get(`/questions/${id}`).then(r => r.data)
export const submitAnswer = (id, userAnswer) =>
  api.post(`/questions/${id}/answer`, { user_answer: userAnswer }).then(r => r.data)
export const getStats = () => api.get('/progress/stats').then(r => r.data)
export const getWrongNotes = () => api.get('/progress/wrong-notes').then(r => r.data)
export const getBookmarks = () => api.get('/progress/bookmarks').then(r => r.data)
export const toggleBookmark = (questionId) =>
  api.post('/progress/bookmark', { question_id: questionId }).then(r => r.data)

export const reportQuestion = (id) =>
  api.post(`/questions/${id}/report`).then(r => r.data)

export const getAdminQuestions = (filter) =>
  api.get('/admin/questions', { params: filter ? { filter } : {} }).then(r => r.data)

export const patchAdminQuestion = (id, data) =>
  api.patch(`/admin/questions/${id}`, data).then(r => r.data)
