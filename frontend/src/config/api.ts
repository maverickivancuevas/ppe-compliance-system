// API Configuration
// This will automatically use the correct API URL based on environment

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const getApiUrl = () => API_URL;
