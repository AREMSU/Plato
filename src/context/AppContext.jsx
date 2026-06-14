import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import apiCall from '../api/client';
import { isMealOwner } from '../utils/helpers';
import API_BASE_URL from '../api/config';

// Show notifications as banners even when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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
    const [hasOnboarded, setHasOnboarded] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
    const appStateRef = useRef(AppState.currentState);
    const notificationListener = useRef();
    const responseListener = useRef();

    // Register device for push notifications and send token to backend
    const registerForPushNotifications = async () => {
        try {
            if (!Device.isDevice) return; // skip emulator

            const { status: existing } = await Notifications.getPermissionsAsync();
            let finalStatus = existing;
            if (existing !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return;

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'cbf07e69-f3d4-4749-bda3-5ef00e401f15',
            });
            const token = tokenData.data;
            if (token) {
                await apiCall('/users/push-token/', 'POST', { token }, true);
            }

            // Android requires a notification channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Plato',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF6B35',
                    sound: true,
                });
            }
        } catch (e) {
            console.log('[Push] Registration error:', e.message);
        }
    };

    // Push notification listeners — reload in-app notification list when a push arrives
    useEffect(() => {
        // Fires when a notification is received while app is in the foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(() => {
            loadNotifications();
        });

        // Fires when user taps a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
            loadNotifications();
        });

        return () => {
            if (notificationListener.current)
                Notifications.removeNotificationSubscription(notificationListener.current);
            if (responseListener.current)
                Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, []);

    // Refresh subscription + wallet whenever app comes back to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => {
            if (appStateRef.current.match(/inactive|background/) && next === 'active') {
                getSubscription();
                loadWallet();
            }
            appStateRef.current = next;
        });
        return () => sub.remove();
    }, []);

    // ─── RESTORE SESSION ON APP START ─────────────────────────
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const [token, storedUser, onboarded] = await AsyncStorage.multiGet([
                    'access_token', 'user', 'has_onboarded'
                ]);
                if (onboarded[1] === 'true') setHasOnboarded(true);
                if (token[1] && storedUser[1]) {
                    setUser(JSON.parse(storedUser[1]));
                    setIsLoggedIn(true);
                    loadMeals();
                    loadBookings();
                    loadBookingsReceived();
                    loadReviewsReceived();
                    loadNotifications();
                    loadAIRecommendations();
                    getSubscription();
                    loadWallet();
                }
            } catch (e) {
                console.log('Session restore error:', e.message);
            } finally {
                setIsInitializing(false);
            }
        };
        restoreSession();
    }, []);

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
            await loadWallet();
            registerForPushNotifications();
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.message);
            return { success: false, error: error.message || 'Invalid email or password.' };
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
        await loadWallet();
        registerForPushNotifications();
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

    const markHandedOver = async (bookingId) => {
        try {
            await apiCall(`/bookings/${bookingId}/handover/`, 'POST', null, true);
            // Optimistically set isHandedOver so buyer's button appears immediately
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, isHandedOver: true } : b
            ));
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const markBookingReceived = async (bookingId) => {
        try {
            await apiCall(`/bookings/${bookingId}/received/`, 'POST', null, true);
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: 'received' } : b
            ));
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const cancelBookingAction = async (bookingId) => {
        const existing = bookings.find(b => b.id === bookingId);
        try {
            const data = await apiCall(`/bookings/${bookingId}/cancel/`, 'POST', null, true);
            setBookings(prev => prev.map(b =>
                b.id === bookingId
                    ? { ...b, status: 'cancelled', refundStatus: existing?.paymentMethod === 'wallet' ? 'completed' : b.refundStatus }
                    : b
            ));

            // Instantly credit wallet if paid via wallet — no extra API call
            if (existing?.paymentMethod === 'wallet' && existing?.totalCost) {
                const refund = Math.round(existing.totalCost * 0.7 * 100) / 100;
                setWallet(prev => ({
                    ...prev,
                    balance: Math.round((prev.balance + refund) * 100) / 100,
                    transactions: [
                        {
                            id: Date.now(),
                            type: 'credit',
                            amount: refund,
                            reason: 'refund',
                            description: 'Refund for cancelled booking',
                            reference: String(bookingId),
                            created_at: new Date().toISOString(),
                        },
                        ...(prev.transactions || []),
                    ],
                }));
            }
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

    // ─── WALLET ────────────────────────────────────────────────

    const loadWallet = async () => {
        try {
            const data = await apiCall('/wallet/', 'GET', null, true);
            if (data && !data.error) setWallet(data);
        } catch (error) {
            console.error('Load wallet error:', error.message);
        }
    };

    const paySubscriptionWithWallet = async (action = 'upgrade') => {
        try {
            const data = await apiCall('/subscription/wallet/pay/', 'POST', { action }, true);
            if (!data.error) {
                setSubscription(data.subscription);
                setWallet(prev => ({
                    ...prev,
                    balance: data.wallet_balance,
                    transactions: [
                        {
                            id: Date.now(),
                            type: 'debit',
                            amount: 199,
                            reason: 'subscription',
                            description: 'Pro subscription payment',
                            reference: action,
                            created_at: new Date().toISOString(),
                        },
                        ...(prev.transactions || []),
                    ],
                }));
            }
            return data;
        } catch (error) {
            return { error: error.message };
        }
    };

    const topupWallet = async (amount) => {
        try {
            const data = await apiCall('/wallet/topup/initiate/', 'POST', { amount }, true);
            return data;
        } catch (error) {
            return { error: error.message };
        }
    };

    const payWithWallet = async (bookingId) => {
        try {
            const data = await apiCall('/wallet/pay/', 'POST', { booking_id: bookingId }, true);
            if (!data.error) {
                await loadWallet();
                await loadBookings();
            }
            return data;
        } catch (error) {
            return { error: error.message };
        }
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
            isInitializing,
            hasOnboarded,
            setHasOnboarded,
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
            wallet,
            loadWallet,
            topupWallet,
            payWithWallet,
            paySubscriptionWithWallet,
            markBookingReceived,
            markHandedOver,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export default AppContext;