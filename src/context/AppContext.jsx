import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiCall from '../api/client';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [meals, setMeals] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);

    // ─── AUTH ─────────────────────────────────────────────────

    const login = async (email, password) => {
        try {
            setLoading(true);
            const data = await apiCall('/auth/login/', 'POST', { email, password });
            await AsyncStorage.setItem('access_token', data.tokens.access);
            await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            setIsLoggedIn(true);
            await loadMeals();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const loginAfterVerification = async (userData, tokens) => {
        try {
            await AsyncStorage.setItem('access_token', tokens.access);
            await AsyncStorage.setItem('refresh_token', tokens.refresh);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setIsLoggedIn(true);
            await loadMeals();
        } catch (error) {
            console.log('Login after verification error:', error);
        }
    };

    const logout = async () => {
        try {
            const refresh = await AsyncStorage.getItem('refresh_token');
            await apiCall('/auth/logout/', 'POST', { refresh }, true);
        } catch (error) {
            console.log('Logout error:', error);
        } finally {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user');
            setUser(null);
            setIsLoggedIn(false);
            setMeals([]);
            setBookings([]);
        }
    };

    // ─── MEALS ────────────────────────────────────────────────

    const loadMeals = async () => {
        try {
            const data = await apiCall('/meals/');
            setMeals(data);
        } catch (error) {
            console.log('Load meals error:', error);
        }
    };

    const addMeal = async (mealData) => {
        try {
            setLoading(true);
            const data = await apiCall('/meals/', 'POST', {
                title: mealData.title,
                description: mealData.description,
                category: mealData.category || 'Nepali',
                price_per_portion: parseFloat(mealData.pricePerPortion),
                total_portions: parseInt(mealData.totalPortions),
                is_vegetarian: mealData.isVegetarian || false,
                image: mealData.image || '',
                pickup_time: mealData.pickupTime,
                pickup_location: mealData.pickupLocation,
                meal_date: mealData.mealDate || new Date().toISOString().split('T')[0],
                tags: mealData.tags || [],
                calories: mealData.calories || 400,
                protein: mealData.protein || 15,
            }, true);
            setMeals(prev => [data, ...prev]);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // ─── BOOKINGS ─────────────────────────────────────────────

    const bookMeal = async (meal, portions) => {
        try {
            setLoading(true);
            const data = await apiCall('/bookings/', 'POST', {
                meal_id: meal.id,
                portions,
            }, true);
            setBookings(prev => [data, ...prev]);
            setMeals(prev => prev.map(m =>
                m.id === meal.id
                    ? { ...m, available_portions: m.available_portions - portions }
                    : m
            ));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const cancelBookingAction = async (bookingId) => {
        try {
            await apiCall(`/bookings/${bookingId}/cancel/`, 'POST', null, true);
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: 'cancelled' } : b
            ));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const loadBookings = async () => {
        try {
            const data = await apiCall('/bookings/', 'GET', null, true);
            setBookings(data);
        } catch (error) {
            console.log('Load bookings error:', error);
        }
    };

    // ─── AI RECOMMENDATIONS ───────────────────────────────────

    const getAIRecommendations = () => {
        const shuffled = [...meals].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
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
            addMeal,
            bookMeal,
            cancelBooking: cancelBookingAction,
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