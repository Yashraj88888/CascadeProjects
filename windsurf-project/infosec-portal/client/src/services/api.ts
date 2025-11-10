import axios from 'axios';

// If REACT_APP_API_BASE is not set, use empty string to prevent double /api prefix
// since the server routes are already prefixed with /api
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || '',
  withCredentials: true
});

export default api;
