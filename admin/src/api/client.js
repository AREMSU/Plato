// Dynamic host detection for local servers (LAN IP, Android Emulator, localhost)
const BASE_URLS = [
  process.env.EXPO_PUBLIC_ADMIN_API_URL || 'https://lather-moonlit-plasma.ngrok-free.dev/panel/api',
  'http://192.168.1.7:8000/panel/api',
  'http://10.0.2.2:8000/panel/api',
  'http://127.0.0.1:8000/panel/api',
  'http://localhost:8000/panel/api'
];

let activeBaseUrl = BASE_URLS[0];
let authToken = null;

export const setToken = (token) => { authToken = token; };
export const getToken = () => authToken;

const headers = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

// Custom fetch with automatic failover fallback URLs
const customFetch = async (endpoint, options = {}) => {
  const mergedOptions = {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(`${activeBaseUrl}${endpoint}`, mergedOptions);
    return res;
  } catch (err) {
    console.log(`Failed connecting to ${activeBaseUrl}${endpoint}, attempting fallbacks...`);
    for (const url of BASE_URLS) {
      if (url === activeBaseUrl) continue;
      try {
        // Use a short 2-second timeout for fallback probing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${url}${endpoint}`, {
          ...mergedOptions,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        activeBaseUrl = url; // Success! Save this working URL
        console.log(`Successfully connected to working server: ${activeBaseUrl}`);
        return res;
      } catch (fallbackErr) {
        // Keep trying the next fallback URL
      }
    }
    // If all failed, throw the final error
    throw err;
  }
};

// Auth
export const adminLogin = (email, password) =>
  customFetch('/login/', { method: 'POST', body: JSON.stringify({ email, password }) }).then(handleResponse);

// Dashboard
export const getDashboard = () =>
  customFetch('/dashboard/').then(handleResponse);

// Users
export const getUsers = (params = '') =>
  customFetch(`/users/?${params}`).then(handleResponse);

export const getUserDetail = (id) =>
  customFetch(`/users/${id}/`).then(handleResponse);

export const userAction = (id, action) =>
  customFetch(`/users/${id}/action/`, { method: 'POST', body: JSON.stringify({ action }) }).then(handleResponse);

// Meals
export const getMeals = (params = '') =>
  customFetch(`/meals/?${params}`).then(handleResponse);

export const getMealDetail = (id) =>
  customFetch(`/meals/${id}/`).then(handleResponse);

export const mealAction = (id, action) =>
  customFetch(`/meals/${id}/action/`, { method: 'POST', body: JSON.stringify({ action }) }).then(handleResponse);

// Bookings
export const getBookings = (params = '') =>
  customFetch(`/bookings/?${params}`).then(handleResponse);

export const cancelBooking = (id) =>
  customFetch(`/bookings/${id}/cancel/`, { method: 'POST' }).then(handleResponse);

export const markRefundComplete = (id) =>
  customFetch(`/bookings/${id}/refund-complete/`, { method: 'POST' }).then(handleResponse);

// Subscriptions
export const getSubscriptions = (params = '') =>
  customFetch(`/subscriptions/?${params}`).then(handleResponse);

export const subscriptionAction = (id, action) =>
  customFetch(`/subscriptions/${id}/action/`, { method: 'POST', body: JSON.stringify({ action }) }).then(handleResponse);

// OTPs
export const getOTPs = () =>
  customFetch('/otps/').then(handleResponse);
