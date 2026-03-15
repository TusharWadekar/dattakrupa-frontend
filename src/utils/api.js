import axios from 'axios';

// ✅ Backend URL
const API = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    }
});

// ✅ Request Interceptor — Har request pe log karo
API.interceptors.request.use(
    (config) => {
        console.log(`API Call: ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response Interceptor — Errors handle karo
API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data?.message);
        return Promise.reject(error);
    }
);

export default API;
