const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const { auth = true, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (auth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    signup: (data: { email: string; password: string; full_name: string }) =>
      fetchAPI('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
        auth: false,
      }),
    
    login: (data: { email: string; password: string }) =>
      fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        auth: false,
      }),
    
    me: () => fetchAPI('/api/auth/me'),
  },

  // Medicines
  medicines: {
    getAll: () => fetchAPI('/api/medicines'),
    getOne: (id: string) => fetchAPI(`/api/medicines/${id}`),
    create: (data: any) =>
      fetchAPI('/api/medicines', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchAPI(`/api/medicines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/api/medicines/${id}`, {
        method: 'DELETE',
      }),
  },

  // Sales
  sales: {
    getAll: () => fetchAPI('/api/sales'),
    create: (data: any) =>
      fetchAPI('/api/sales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Categories
  categories: {
    getAll: () => fetchAPI('/api/categories'),
    create: (data: { name: string; description?: string }) =>
      fetchAPI('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Dashboard
  dashboard: {
    getStats: () => fetchAPI('/api/dashboard/stats'),
    getRecentSales: () => fetchAPI('/api/dashboard/recent-sales'),
    getLowStock: () => fetchAPI('/api/dashboard/low-stock'),
  },
};
