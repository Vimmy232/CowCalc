const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getAuthToken = () => localStorage.getItem('cowcalc_token');
export const setAuthToken = (token) => localStorage.setItem('cowcalc_token', token);
export const clearAuthToken = () => localStorage.removeItem('cowcalc_token');

export const getAdminStatus = () => localStorage.getItem('cowcalc_is_admin') === 'true';
export const setAdminStatus = (isAdmin) => localStorage.setItem('cowcalc_is_admin', isAdmin);

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const login = async (key_name, secret) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_name, secret })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  const data = await res.json();
  setAuthToken(data.token);
  setAdminStatus(data.project_key.is_admin);
  return data;
};

export const logout = () => {
  clearAuthToken();
  localStorage.removeItem('cowcalc_is_admin');
};

export const getMetaBuilds = async () => {
  const res = await fetch(`${API_URL}/builds?is_meta=true`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch meta builds');
  return res.json();
};

export const saveBuild = async (title, description, plan_data, is_meta = false) => {
  const res = await fetch(`${API_URL}/builds`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, description, plan_data, is_meta })
  });
  if (!res.ok) throw new Error('Failed to save build');
  return res.json();
};

export const forceLogoutAll = async () => {
  const res = await fetch(`${API_URL}/auth/force-logout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to force logout');
  return res.json();
};

export const createKey = async (key_name, secret, is_admin) => {
  const res = await fetch(`${API_URL}/auth/keys`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ key_name, secret, is_admin })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to create key');
  return res.json();
};

export const listKeys = async () => {
  const res = await fetch(`${API_URL}/auth/keys`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch keys');
  return res.json();
};
