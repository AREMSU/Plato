import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiCall from '../api/client';
import API_BASE_URL from '../api/config';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [meals, setMeals] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // ─── AUTH ─────────────────────────────────────────────────

    const login = async (email, password) => {
        setLoading(true);
        const data = await apiCall('/auth/login/', 'POST', { email, password });
        setLoading(false);

        if (data?.error) {
            const msg = data.error.error || data.error.detail || 'Login failed';
            return { success: false, error: msg };
        }

        await AsyncStorage.setItem('access_token', data.tokens.access);
        await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setIsLoggedIn(true);
        await loadMeals();
        return { success: true };
    };

    const loginAfterVerification = async (userData, tokens) => {
        await AsyncStorage.setItem('access_token', tokens.access);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
        await loadMeals();
    };

    const logout = async () => {
        if (loggingOut) return;  // prevent double press
        setLoggingOut(true);
        try {
            const refresh = await AsyncStorage.getItem('refresh_token');
            const access = await AsyncStorage.getItem('access_token');

            if (refresh && access) {
                await fetch(`${API_BASE_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: JSON.stringify({ refresh }),
                });
            }
        } catch (error) {
            console.log('Logout error:', error);
        } finally {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
            setUser(null);
            setIsLoggedIn(false);
            setMeals([]);
            setBookings([]);
            setLoggingOut(false);
        }
    };

    // ─── MEALS ────────────────────────────────────────────────

    const loadMeals = async () => {
        const data = await apiCall('/meals/');
        if (!data?.error) {
            setMeals(Array.isArray(data) ? data : []);
        }
    };

    const addMeal = async (mealData) => {
        setLoading(true);
        // Use camelCase — client.js converts to snake_case automatically
        const data = await apiCall('/meals/', 'POST', {
            title: mealData.title,
            description: mealData.description,
            category: mealData.category || 'Nepali',
            pricePerPortion: parseFloat(mealData.pricePerPortion),
            totalPortions: parseInt(mealData.totalPortions),
            availablePortions: parseInt(mealData.totalPortions),
            isVegetarian: mealData.isVegetarian || false,
            image: mealData.image || '',
            pickupTime: mealData.pickupTime,
            pickupLocation: mealData.pickupLocation,
            mealDate: mealData.mealDate || new Date().toISOString().split('T')[0],
            tags: mealData.tags || [],
            calories: mealData.calories || 400,
            protein: mealData.protein || 15,
        }, true);
        setLoading(false);

        if (data?.error) {
            return { error: data.error };
        }

        setMeals(prev => [data, ...prev]);
        return data;  // return meal object so AddMealScreen can check !result.error
    };

    // ─── BOOKINGS ─────────────────────────────────────────────

    const bookMeal = async (meal, portions) => {
        setLoading(true);
        const data = await apiCall('/bookings/', 'POST', {
            mealId: meal.id,   // client.js converts to meal_id automatically
            portions,
        }, true);
        setLoading(false);

        if (data?.error) {
            return { error: data.error };
        }

        setBookings(prev => [data, ...prev]);
        // Update available portions locally
        setMeals(prev => prev.map(m =>
            m.id === meal.id
                ? { ...m, availablePortions: (m.availablePortions || 0) - portions }
                : m
        ));
        return data;
    };

    const cancelBookingAction = async (bookingId) => {
        const data = await apiCall(`/bookings/${bookingId}/cancel/`, 'POST', null, true);
        if (data?.error) {
            return { error: data.error };
        }
        setBookings(prev => prev.map(b =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
        ));
        return { success: true };
    };

    const loadBookings = async () => {
        const data = await apiCall('/bookings/', 'GET', null, true);
        if (!data?.error) {
            setBookings(Array.isArray(data) ? data : []);
        }
    };

    // ─── AI RECOMMENDATIONS ───────────────────────────────────

    const getAIRecommendations = () => {
        return [...meals].sort(() => 0.5 - Math.random()).slice(0, 3);
    };

    return (
        <AppContext.Provider value={{
            user,
            meals,
            bookings,
            isLoggedIn,
            loading,
            login,
            loginAfterVerification,
            logout,
            loggingOut,
            addMeal,
            bookMeal,
            cancelBooking: cancelBookingAction,
            cancelBookingAction,
            loadMeals,
            loadBookings,
            getAIRecommendations,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export default AppContext;