import apiCall from './client';

export const getBookings = async () => {
    return await apiCall('/bookings/');
};

export const createBooking = async (mealId, portions) => {
    return await apiCall('/bookings/', 'POST', {
        meal_id: mealId,
        portions,
    });
};

export const cancelBooking = async (bookingId) => {
    return await apiCall(`/bookings/${bookingId}/cancel/`, 'POST');
};