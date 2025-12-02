import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Retry helper with exponential backoff
async function retryRequest<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      const isLastAttempt = i === retries - 1;
      const isNetworkError = !axiosError.response;
      const isServerError = axiosError.response?.status && axiosError.response.status >= 500;
      const isRateLimitError = axiosError.response?.status === 429;
      
      // Only retry on network errors, server errors, or rate limits
      if (isLastAttempt || (!isNetworkError && !isServerError && !isRateLimitError)) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries reached');
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for session cookies
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// User-friendly error messages
function getUserFriendlyErrorMessage(error: AxiosError): string {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;
    
    switch (status) {
      case 400:
        return data?.error || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return data?.error || 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Our team has been notified.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.error || 'An unexpected error occurred.';
    }
  } else if (error.request) {
    return 'Unable to connect to server. Please check your internet connection.';
  } else {
    return error.message || 'An unexpected error occurred.';
  }
}

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Enhance error with user-friendly message
    const enhancedError = error as AxiosError & { userMessage?: string };
    enhancedError.userMessage = getUserFriendlyErrorMessage(error);
    
    // Handle common errors
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login (but not for /api/auth/status)
          if (!error.config?.url?.includes('/api/auth/status')) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 500);
          }
          break;
      }
    }
    
    return Promise.reject(enhancedError);
  }
);

// Generic request wrapper with type safety and retry logic
export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await retryRequest(() => apiClient.request<T>(config));
    return response.data;
  } catch (error) {
    // Error is already enhanced with userMessage in interceptor
    throw error;
  }
}

// Convenience methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'GET', url }),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'POST', url, data }),
    
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'PUT', url, data }),
    
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'PATCH', url, data }),
    
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'DELETE', url }),
};

export default apiClient;

