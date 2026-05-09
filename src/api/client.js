import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './config';

const apiCall = async (endpoint, method = 'GET', body = null, requiresAuth = false) => {
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };

    // Only add token for protected endpoints
    if (requiresAuth) {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    console.log('API CALL:', method, `${API_BASE_URL}${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.detail || 'Something went wrong');
    }

    return data;
};

export default apiCall;