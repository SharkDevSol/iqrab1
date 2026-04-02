import axios from 'axios';

// API base URL - includes /api prefix for all routes
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iqrab1.skoolific.com/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.error;
      const action = error.response?.data?.action;
      
      console.error('🔒 Authentication Error:', errorMessage || 'Unauthorized');
      
      // Handle signature mismatch specifically
      if (errorCode === 'SIGNATURE_MISMATCH' || action === 'LOGOUT_REQUIRED') {
        console.error('⚠️  JWT Signature Mismatch - Token was generated with different secret');
        
        // Clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('staffUser');
        localStorage.removeItem('userType');
        
        alert('Your session is invalid. This can happen after a server update. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Clear auth data for other 401 errors
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('staffUser');
      localStorage.removeItem('userType');
      
      // Show user-friendly message
      if (errorCode === 'TOKEN_EXPIRED') {
        alert('Your session has expired. Please log in again.');
      } else if (errorMessage === 'Access token required') {
        alert('Authentication required. Please log in.');
      } else {
        alert('Authentication failed. Please log in again.');
      }
      
      // Redirect to login
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response?.data?.error);
    }
    
    // Handle 429 Too Many Requests - rate limited
    if (error.response?.status === 429) {
      console.error('Rate limited:', error.response?.data?.error);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return token && isLoggedIn;
};

// Helper function to get current user
export const getCurrentUser = () => {
  const adminUser = localStorage.getItem('adminUser');
  const staffUser = localStorage.getItem('staffUser');
  
  if (adminUser) {
    try {
      return JSON.parse(adminUser);
    } catch (e) {
      return null;
    }
  }
  
  if (staffUser) {
    try {
      return JSON.parse(staffUser);
    } catch (e) {
      return null;
    }
  }
  
  return null;
};

// Helper function to get user type
export const getUserType = () => {
  return localStorage.getItem('userType') || 'guest';
};

// Helper function to logout
export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('staffUser');
  localStorage.removeItem('staffProfile');
  localStorage.removeItem('userType');
  localStorage.removeItem('userPermissions');
  window.location.href = '/login';
};

// Verify token is still valid
export const verifyToken = async () => {
  try {
    const response = await api.get('/admin/verify-token');
    return response.data.valid === true;
  } catch (error) {
    return false;
  }
};

export default api;
