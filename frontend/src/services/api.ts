import axios from 'axios';
import { API_BASE_URL } from '@/constants';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes — analysis can take a while
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.response?.data?.message || error.message;
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);
