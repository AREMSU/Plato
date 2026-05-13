import React, { createContext, useContext, useState } from 'react';
import { mockMeals, mockUsers, subscriptionPlans } from '../data/mockData';

const AppContext = createContext();

// ─── Premium Constants ────────────────────────────────────────────────────────
export const PREMIUM_PRICE = 199;
export const PREMIUM_ORIGINAL_PRICE = 399;
export const PREMIUM_DISCOUNT_PERCENT = 30;

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState(mockMeals);
  const [bookings, setBookings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const login = (email, password) => {
    const foundUser = mockUsers.find(
      (u) => u.email === email && u.password === password
    );
    if (foundUser) {
      setUser(foundUser);
      setIsLoggedIn(true);
      return { success: true };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const register = (userData) => {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      avatar: 'https://i.pravatar.cc/150?img=10',
      rating: 5.0,
      mealsShared: 0,
      joinedDate: new Date().toISOString(),
      subscription: 'free',
      subscriptionExpiry: null,
    };
    setUser(newUser);
    setIsLoggedIn(true);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setBookings([]);
    setCart(null);
  };

  // ── Meals ──────────────────────────────────────────────────────────────────
  const addMeal = (mealData) => {
    const newMeal = {
      id: Date.now().toString(),
      ...mealData,
      sellerId: user?.id,
      sellerName: user?.name,
      sellerAvatar: user?.avatar,
      sellerRating: user?.rating,
      createdAt: new Date().toISOString(),
      bookings: 0,
    };
    setMeals((prev) => [newMeal, ...prev]);
    return { success: true };
  };

  // ── Bookings ───────────────────────────────────────────────────────────────
  const bookMeal = (meal, portions) => {
    const totalCost = meal.pricePerPortion * portions;
    const discountPercent = getSubscriptionDiscount(user?.subscription);
    const discountAmount = Math.round((totalCost * discountPercent) / 100);
    const finalCost = totalCost - discountAmount;

    const booking = {
      id: Date.now().toString(),
      meal,
      portions,
      totalCost,
      discountAmount,
      discountPercent,
      finalCost,
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
      userId: user?.id,
    };

    setBookings((prev) => [booking, ...prev]);
    setMeals((prev) =>
      prev.map((m) =>
        m.id === meal.id
          ? {
              ...m,
              bookings: m.bookings + portions,
              availablePortions: m.availablePortions - portions,
            }
          : m
      )
    );
    return { success: true, booking };
  };

  const cancelBooking = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      )
    );
  };

  // ── AI Recommendations ─────────────────────────────────────────────────────
  const getAIRecommendations = () => {
    const shuffled = [...meals].sort(() => 0.5 - Math.random());
    // Premium users get 6 recommendations, others get 3
    const count = isPremium() ? 6 : 3;
    return shuffled.slice(0, count);
  };

  // ── Subscription Helpers ───────────────────────────────────────────────────

  const getSubscriptionDiscount = (planId) => {
    switch (planId) {
      case 'premium':
        return PREMIUM_DISCOUNT_PERCENT; // 30%
      case 'pro':
        return 20;
      case 'standard':
        return 15;
      case 'basic':
        return 10;
      default:
        return 0;
    }
  };

  const getCommissionRate = (planId) => {
    switch (planId) {
      case 'premium':
        return 1; // 1% for premium
      case 'pro':
        return 3; // 3% for pro
      case 'standard':
        return 2; // 2% for standard
      default:
        return 5; // 5% for free & basic
    }
  };

  /**
   * Returns true ONLY when:
   * 1. user exists
   * 2. user.subscription === 'premium'
   * 3. subscriptionExpiry is in the future
   */
  const isPremium = () => {
    if (!user) return false;
    if (user.subscription !== 'premium') return false;
    if (!user.subscriptionExpiry) return false;
    return new Date(user.subscriptionExpiry) > new Date();
  };

  /**
   * Returns true for ANY paid plan with valid expiry
   */
  const isSubscribed = () => {
    if (!user) return false;
    if (!user.subscription || user.subscription === 'free') return false;
    if (!user.subscriptionExpiry) return false;
    return new Date(user.subscriptionExpiry) > new Date();
  };

  /**
   * Upgrades user to given planId.
   * Sets 1-month expiry from today.
   */
  const upgradeSubscription = (planId) => {
    if (!user) return { success: false, message: 'User not logged in' };

    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return { success: false, message: 'Plan not found' };

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Use functional update to avoid stale closure
    setUser((prev) => ({
      ...prev,
      subscription: planId,
      subscriptionExpiry: expiryDate.toISOString(),
    }));

    return {
      success: true,
      message:
        planId === 'premium'
          ? `🎉 Welcome to Premium! You now get ${PREMIUM_DISCOUNT_PERCENT}% off every booking.`
          : `Successfully upgraded to ${plan.name}!`,
    };
  };

  /**
   * Downgrades user back to free plan.
   */
  const cancelSubscription = () => {
    if (!user) return { success: false, message: 'User not logged in' };

    // Use functional update to avoid stale closure
    setUser((prev) => ({
      ...prev,
      subscription: 'free',
      subscriptionExpiry: null,
    }));

    return { success: true, message: 'Subscription cancelled successfully' };
  };

  /**
   * Returns a plan object by ID from subscriptionPlans array.
   */
  const getSubscriptionPlan = (planId) => {
    return subscriptionPlans.find((p) => p.id === planId) ?? null;
  };

  // ── Context Value ──────────────────────────────────────────────────────────
  return (
    <AppContext.Provider
      value={{
        // ── State ─────────────────────────────────────────────────────────
        user,
        setUser,
        meals,
        bookings,
        isLoggedIn,
        cart,
        setCart,

        // ── Auth ──────────────────────────────────────────────────────────
        login,
        register,
        logout,

        // ── Meals ─────────────────────────────────────────────────────────
        addMeal,

        // ── Bookings ──────────────────────────────────────────────────────
        bookMeal,
        cancelBooking,

        // ── AI ────────────────────────────────────────────────────────────
        getAIRecommendations,

        // ── Subscription ──────────────────────────────────────────────────
        upgradeSubscription,
        cancelSubscription,
        getSubscriptionDiscount,
        getCommissionRate,
        getSubscriptionPlan,
        subscriptionPlans,

        // ── NEW: used by SubscriptionScreen ───────────────────────────────
        isPremium,              // () => boolean
        isSubscribed,           // () => boolean

        // ── NEW: Premium price constants ──────────────────────────────────
        PREMIUM_PRICE,          // 199
        PREMIUM_ORIGINAL_PRICE, // 399
        PREMIUM_DISCOUNT_PERCENT, // 30
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};