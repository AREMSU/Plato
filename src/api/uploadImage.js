// src/api/uploadImage.js
// Uploads an image to Cloudinary and returns the public URL.
// No backend changes needed — URL is stored in meal.image field.

import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './config';
import * as ImagePicker from 'expo-image-picker';

const CLOUDINARY_CLOUD_NAME = 'dy3zdsgxs';   
const CLOUDINARY_UPLOAD_PRESET = 'plato_images';    

export const uploadImageToCloudinary = async (localUri) => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: localUri,
            type: 'image/jpeg',
            name: 'meal_photo.jpg',
        });
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );

        const data = await response.json();

        if (data.secure_url) {
            console.log('Cloudinary upload success:', data.secure_url);
            return data.secure_url;
        } else {
            console.error('Cloudinary error:', data);
            return null;
        }
    } catch (error) {
        console.error('Upload failed:', error);
        return null;
    }
};

export const verifyImageWithBackend = async (localUri) => {
    try {
        const token = await AsyncStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('image', {
            uri: localUri,
            type: 'image/jpeg',
            name: 'meal_photo.jpg',
        });

        const response = await fetch(`${API_BASE_URL}/ai/verify-image/`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'ngrok-skip-browser-warning': 'true',
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data?.error || 'Verification failed.';
            throw new Error(message);
        }

        return data;
    } catch (error) {
        console.error('Verification failed:', error.message);
        throw error;
    }
};