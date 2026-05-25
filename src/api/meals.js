import apiCall from './client';

export const getMeals = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return await apiCall(`/meals/${params ? '?' + params : ''}`);
};

export const getMealDetail = async (id) => {
    return await apiCall(`/meals/${id}/`);
};

export const createMeal = async (mealData) => {
    return await apiCall('/meals/', 'POST', mealData);
};

export const getMyMeals = async () => {
    return await apiCall('/meals/my/');
};