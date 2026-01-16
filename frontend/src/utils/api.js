import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api', // La URL de tu servidor Node.js
});

// Este interceptor añade el token de seguridad automáticamente si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

export default api;