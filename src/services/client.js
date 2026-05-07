import axios from 'axios';

const api = axios.create({
  // Em produção, usa a variável de ambiente VITE_API_URL (definida no build Docker)
  // Em desenvolvimento local, faz fallback para localhost:5110
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5110', 
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