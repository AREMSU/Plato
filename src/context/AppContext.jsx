import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiCall from '../api/client';
import { isMealOwner } from '../utils/helpers';
import API_BASE_URL from '../api/config';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [meals, setMeals] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [bookingsReceived, setBookingsReceived] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [subscription, setSubscription] = useState(null);

    // ─── AUTH ─────────────────────────────────────────────────

    const login = async (email, password) => {
        setLoading(true);
        try {
            const data = await apiCall('/auth/login/', 'POST', { email, password });

            await AsyncStorage.setItem('access_token', data.tokens.access);
            await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            setIsLoggedIn(true);
            await loadMeals();
            await loadBookings();
            await loadBookingsReceived();
            await loadReviewsReceived();
            await loadNotifications();
            await loadAIRecommendations();
            await getSubscription();
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.message);
            return { success: false, error: 'Login failed. Please try again.' };
        } finally {
            setLoading(false);
        }
    };

    const loginAfterVerification = async (userData, tokens) => {
        await AsyncStorage.setItem('access_token', tokens.access);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
        await loadMeals();
        await loadBookings();
        await loadBookingsReceived();
        await loadReviewsReceived();
        await loadNotifications();
        await loadAIRecommendations();
        await getSubscription();
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
            setBookingsReceived([]);
            setLoggingOut(false);
        }
    };

    const refreshUserData = async () => {
        try {
            const data = await apiCall('/users/me/', 'GET', null, true);
            if (data && !data.error) {
                setUser(data);
                await AsyncStorage.setItem('user', JSON.stringify(data));
            }
            await Promise.all([
                loadMeals(),
                loadBookings(),
                loadBookingsReceived(),
                loadReviewsReceived(),
                loadNotifications(),
                loadAIRecommendations(),
                getSubscription()
            ]);
        } catch (error) {
            console.log('Refresh user data error:', error.message);
        }
    };

    // ─── MEALS ────────────────────────────────────────────────

    const loadMeals = async () => {
        try {
            const data = await apiCall('/meals/');
            setMeals(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Load meals error:', error.message);
        }
    };

    const addMeal = async (mealData) => {
        setLoading(true);
        try {
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

            setMeals(prev => [data, ...prev]);
            return data;  // return meal object so AddMealScreen can check !result.error
        } catch (error) {
            console.error('Add meal error:', error.message);
            return { error: 'Failed to add meal. Please try again.' };
        } finally {
            setLoading(false);
        }
    };

    // ─── BOOKINGS ─────────────────────────────────────────────

    const bookMeal = async (meal, portions) => {
        setLoading(true);
        try {
            const data = await apiCall('/bookings/', 'POST', {
                mealId: meal.id,   // client.js converts to meal_id automatically
                portions,
            }, true);

            setBookings(prev => [data, ...prev]);
            // Update available portions locally
            setMeals(prev => prev.map(m =>
                m.id === meal.id
                    ? { ...m, availablePortions: (m.availablePortions || 0) - portions }
                    : m
            ));
            return { success: true, booking: data };
        } catch (error) {
            console.error('Book meal error:', error.message);
            return { error: 'Failed to book meal. Please try again.' };
        } finally {
            setLoading(false);
        }
    };

    const cancelBookingAction = async (bookingId) => {
        const existing = bookings.find(b => b.id === bookingId);
        try {
            const data = await apiCall(`/bookings/${bookingId}/cancel/`, 'POST', null, true);
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: 'cancelled' } : b
            ));
            setMeals(prev => prev.map(m => {
                const mealId = data?.meal?.id ?? existing?.meal?.id;
                if (!mealId || m.id !== mealId) return m;

                const updated = { ...m };
                const available = data?.meal?.available_portions ?? data?.meal?.availablePortions;
                const bookingsCount = data?.meal?.bookings;

                if (typeof available === 'number') {
                    updated.availablePortions = available;
                } else if (existing?.portions) {
                    updated.availablePortions = (m.availablePortions || 0) + existing.portions;
                }

                if (typeof bookingsCount === 'number') {
                    updated.bookings = bookingsCount;
                }

                return updated;
            }));
            return { success: true };
        } catch (error) {
            console.error('Cancel booking error:', error.message);
            return { error: 'Failed to cancel booking. Please try again.' };
        }
    };

    const loadBookings = async () => {
        try {
            const data = await apiCall('/bookings/', 'GET', null, true);
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Load bookings error:', error.message);
        }
    };

    const loadBookingsReceived = async () => {
        try {
            const data = await apiCall('/bookings/received/', 'GET', null, true);
            setBookingsReceived(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Load bookings received error:', error.message);
        }
    };

    const loadReviewsReceived = async () => {
        try {
            const data = await apiCall('/reviews/received/', 'GET', null, true);
            setReviewsReceived(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Load reviews error:', error.message);
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await apiCall('/notifications/', 'GET', null, true);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Load notifications error:', error.message);
        }
    };

    const markNotificationsRead = async (notificationId = null) => {
        try {
            const body = notificationId ? { notificationId } : null;
            await apiCall('/notifications/read/', 'POST', body, true);
            await loadNotifications();
        } catch (error) {
            console.log('Mark notifications read error:', error.message);
        }
    };

    const createReview = async (bookingId, rating, comment) => {
        try {
            const data = await apiCall('/reviews/', 'POST', {
                bookingId,
                rating,
                comment,
            }, true);
            await loadReviewsReceived();
            await loadBookings();
            await loadMeals();
            return { success: true, review: data };
        } catch (error) {
            console.error('Submit review error:', error.message);
            return { error: 'Failed to submit review. Please try again.' };
        }
    };

    const loadAIRecommendations = async () => {
        try {
            const data = await apiCall('/ai/recommended/');
            const flattened = Object.values(data || {}).flat();
            setAiRecommendations(flattened);
        } catch (error) {
            console.log('Load AI recommendations error:', error.message);
        }
    };

    // ─── AI RECOMMENDATIONS ───────────────────────────────────

    const getAIRecommendations = () => {
        if (aiRecommendations.length) return aiRecommendations.slice(0, 5);
        const availableMeals = meals.filter((meal) => !isMealOwner(user, meal));
        return [...availableMeals].sort(() => 0.5 - Math.random()).slice(0, 3);
    };

    // ─── SUBSCRIPTION ──────────────────────────────────────────

    const getSubscription = async () => {
        try {
            const data = await apiCall('/subscription/', 'GET', null, true);
            if (!data?.error) setSubscription(data);
            return data;
        } catch (error) {
            console.error('Get subscription error:', error.message);
            return { error: 'Something went wrong. Please try again.' };
        }
    };

    const upgradeSubscription = async () => {
        try {
            const data = await apiCall('/subscription/upgrade/', 'POST', null, true);
            if (!data?.error) await getSubscription();
            return data;
        } catch (error) {
            console.error('Upgrade subscription error:', error.message);
            return { error: 'Something went wrong. Please try again.' };
        }
    };

    const cancelSubscription = async () => {
        try {
            const data = await apiCall('/subscription/cancel/', 'POST', null, true);
            if (!data?.error) await getSubscription();
            return data;
        } catch (error) {
            console.error('Cancel subscription error:', error.message);
            return { error: 'Something went wrong. Please try again.' };
        }
    };

    const renewSubscription = async () => {
        try {
            const data = await apiCall('/subscription/renew/', 'POST', null, true);
            if (!data?.error) await getSubscription();
            return data;
        } catch (error) {
            console.error('Renew subscription error:', error.message);
            return { error: 'Something went wrong. Please try again.' };
        }
    };

    return (
        <AppContext.Provider value={{
            user,
            setUser,
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
            bookingsReceived,
            loadBookingsReceived,
            reviewsReceived,
            loadReviewsReceived,
            createReview,
            notifications,
            loadNotifications,
            markNotificationsRead,
            loadAIRecommendations,
            getAIRecommendations,
            subscription,
            getSubscription,
            upgradeSubscription,
            cancelSubscription,
            renewSubscription,
            refreshUserData,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export default AppContext;