import React, { createContext, useContext, useState } from 'react';
import { mockMeals, mockUsers, subscriptionPlans } from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState(mockMeals);
  const [bookings, setBookings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState(null);

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

  const bookMeal = (meal, portions) => {
    const totalCost = meal.pricePerPortion * portions;
    const discountPercent = getSubscriptionDiscount(user?.subscription);
    const discountAmount = (totalCost * discountPercent) / 100;
    const finalCost = totalCost - discountAmount;
    
    const booking = {
      id: Date.now().toString(),
      meal,
      portions,
      totalCost,
      discountAmount,
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

  const getAIRecommendations = () => {
    const shuffled = [...meals].sort(() => 0.5 - Math.random());
    // Return more suggestions for Standard plan users
    const recommendationCount = user?.subscription === 'standard' ? 6 : 3;
    return shuffled.slice(0, recommendationCount);
  };

  const getSubscriptionDiscount = (planId) => {
    switch (planId) {
      case 'basic':
        return 10;
      case 'standard':
        return 15;
      case 'pro':
        return 20;
      case 'premium':
        return 30;
      default:
        return 0;
    }
  };

  const getCommissionRate = (planId) => {
    switch (planId) {
      case 'standard':
        return 2; // 2% commission for Standard plan
      case 'pro':
        return 3; // 3% commission for Pro plan
      case 'premium':
        return 1; // 1% commission for Premium plan
      default:
        return 5; // 5% commission for Free and Basic plans
    }
  };

  const upgradeSubscription = (planId) => {
    if (!user) return { success: false, message: 'User not logged in' };
    
    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return { success: false, message: 'Plan not found' };

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    setUser({
      ...user,
      subscription: planId,
      subscriptionExpiry: expiryDate.toISOString(),
    });

    return { success: true, message: `Upgraded to ${plan.name}!` };
  };

  const cancelSubscription = () => {
    if (!user) return { success: false };
    
    setUser({
      ...user,
      subscription: 'free',
      subscriptionExpiry: null,
    });
    
    return { success: true, message: 'Subscription cancelled' };
  };

  const getSubscriptionPlan = (planId) => {
    return subscriptionPlans.find((p) => p.id === planId);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        meals,
        bookings,
        isLoggedIn,
        cart,
        setCart,
        login,
        register,
        logout,
        addMeal,
        bookMeal,
        cancelBooking,
        getAIRecommendations,
        upgradeSubscription,
        cancelSubscription,
        getSubscriptionDiscount,
        getCommissionRate,
        getSubscriptionPlan,
        subscriptionPlans,
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
