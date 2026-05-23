import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminLogin as apiLogin, setToken } from '../api/client';

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      setToken(data.tokens.access);
      await AsyncStorage.setItem('admin_token', data.tokens.access);
      await AsyncStorage.setItem('admin_refresh', data.tokens.refresh);
      setUser(data.user);
      setIsLoggedIn(true);
      return { success: true };
    } catch (err) {
      console.log('Admin login error:', err);
      const errMsg = err.error || err.message || 'Connection failed. Please ensure the backend is running and matches client.js IP.';
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    await AsyncStorage.removeItem('admin_token');
    await AsyncStorage.removeItem('admin_refresh');
    setUser(null);
    setIsLoggedIn(false);
  };

  const restoreSession = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (token) {
      setToken(token);
      setIsLoggedIn(true);
    }
  };

  return (
    <AdminContext.Provider value={{ user, isLoggedIn, loading, login, logout, restoreSession }}>
      {children}
    </AdminContext.Provider>
  );
};
