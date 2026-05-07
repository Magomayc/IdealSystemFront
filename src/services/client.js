import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://2.24.83.230:8080', 
});

// (Opcional) Interceptor para adicionar token no futuro
api.interceptors.request.use(config => {
  const token = localStorage.getItem('usuario_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;