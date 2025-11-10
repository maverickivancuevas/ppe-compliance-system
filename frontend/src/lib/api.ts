import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, full_name: string, role: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name,
      role
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Users
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/users/', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};

// Cameras
export const camerasAPI = {
  getAll: async () => {
    const response = await api.get('/cameras/');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/cameras/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/cameras/', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/cameras/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/cameras/${id}`);
  },
};

// Detections
export const detectionsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/detections/', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/detections/${id}`);
    return response.data;
  },

  getStats: async (params?: any) => {
    const response = await api.get('/detections/stats/summary', { params });
    return response.data;
  },

  saveManual: async (data: any) => {
    const response = await api.post('/detections/manual', data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/detections/${id}`);
  },
};

// Alerts
export const alertsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/alerts/', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/alerts/stats');
    return response.data;
  },

  acknowledge: async (id: string) => {
    const response = await api.put(`/alerts/${id}/acknowledge`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/alerts/all');
    return response.data;
  },
};

// Incidents
export const incidentsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/incidents/', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/incidents/', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/incidents/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/incidents/${id}`);
  },

  getStats: async () => {
    const response = await api.get('/incidents/stats/summary');
    return response.data;
  },
};

// Reports
export const reportsAPI = {
  generate: async (data: any) => {
    const response = await api.post('/reports/generate', data, {
      responseType: 'blob'
    });
    return response;
  },

  generateQuick: async (reportType: string, format: string) => {
    const response = await api.get(`/reports/quick/${reportType}`, {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  downloadTemplate: async (templateType: string) => {
    const response = await api.get(`/reports/template/${templateType}`, {
      responseType: 'blob'
    });
    return response;
  },
};

// Analytics
export const analyticsAPI = {
  getComplianceTrend: async (params?: any) => {
    const response = await api.get('/analytics/compliance-trend', { params });
    return response.data;
  },

  getViolationsByCamera: async (params?: any) => {
    const response = await api.get('/analytics/violations-by-camera', { params });
    return response.data;
  },

  getViolationTypes: async (params?: any) => {
    const response = await api.get('/analytics/violation-types', { params });
    return response.data;
  },

  getSummary: async (params?: any) => {
    const response = await api.get('/analytics/summary', { params });
    return response.data;
  },

  getHeatmap: async (params?: any) => {
    const response = await api.get('/analytics/heatmap', { params });
    return response.data;
  },

  getShiftAnalytics: async (params?: any) => {
    const response = await api.get('/analytics/shift-analytics', { params });
    return response.data;
  },
};

// Workers
export const workersAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/workers/', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/workers/${id}`);
    return response.data;
  },

  getByAccountNumber: async (accountNumber: string) => {
    const response = await api.get(`/workers/account/${accountNumber}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/workers/', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/workers/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/workers/${id}`);
  },

  downloadQR: async (id: string) => {
    const response = await api.get(`/workers/${id}/qr`, {
      responseType: 'blob'
    });
    return response;
  },

  getStats: async () => {
    const response = await api.get('/workers/stats/summary');
    return response.data;
  },
};

// Attendance
export const attendanceAPI = {
  checkIn: async (data: any) => {
    const response = await api.post('/attendance/check-in', data);
    return response.data;
  },

  checkOut: async (data: any) => {
    const response = await api.post('/attendance/check-out', data);
    return response.data;
  },

  getAll: async (params?: any) => {
    const response = await api.get('/attendance/', { params });
    return response.data;
  },

  getToday: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  getWorkerStats: async (workerId: string) => {
    const response = await api.get(`/attendance/stats/worker/${workerId}`);
    return response.data;
  },
};

export default api;
