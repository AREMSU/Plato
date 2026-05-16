import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './config';

// ── Key converters ────────────────────────────────────────────────────────────

const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
const toSnakeCase = (str) => str.replace(/([A-Z])/g, (l) => `_${l.toLowerCase()}`);

const convertKeys = (obj, converter) => {
    if (Array.isArray(obj)) return obj.map((i) => convertKeys(i, converter));
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [converter(k), convertKeys(v, converter)])
        );
    }
    return obj;
};

// ── Main API call ─────────────────────────────────────────────────────────────

const apiCall = async (endpoint, method = 'GET', body = null, requiresAuth = false) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        };

        if (requiresAuth) {
            // Try both key names for safety
            const token = await AsyncStorage.getItem('access_token');

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                console.warn('No token found for authenticated request:', endpoint);
            }
        }

        const config = { method, headers };

        if (body) {
            // Convert camelCase body → snake_case before sending to Django
            const snakeBody = convertKeys(body, toSnakeCase);
            config.body = JSON.stringify(snakeBody);
            console.log('API CALL:', method, `${API_BASE_URL}${endpoint}`);
            console.log('REQUEST BODY:', JSON.stringify(snakeBody));
        } else {
            console.log('API CALL:', method, `${API_BASE_URL}${endpoint}`);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle empty responses (DELETE returns 204)
        if (response.status === 204) {
            return { success: true };
        }

        const data = await response.json();
        console.log('API RESPONSE:', response.status, JSON.stringify(data));

        if (!response.ok) {
            console.log('API ERROR:', response.status, JSON.stringify(data));
            return { error: data, status: response.status };
        }

        // Convert all response keys from snake_case → camelCase
        return convertKeys(data, toCamelCase);

    } catch (error) {
        console.error('API CALL FAILED:', error.message);
        return { error: { message: 'Network error. Is the server running?' } };
    }
};

export default apiCall;