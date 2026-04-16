import React, { createContext, useContext, useState } from 'react';
import { mockMeals, mockUsers } from '../data/mockData';

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
    const booking = {
      id: Date.now().toString(),
      meal,
      portions,
      totalCost,
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
    return shuffled.slice(0, 3);
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
