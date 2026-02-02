// frontend/src/lib/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: '', // usamos proxy del package.json -> /api/*
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['x-auth-token'] = token;
  return config;
});
