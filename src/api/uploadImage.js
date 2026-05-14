// src/api/uploadImage.js
// Uploads an image to Cloudinary and returns the public URL.
// No backend changes needed — URL is stored in meal.image field.

import * as ImagePicker from 'expo-image-picker';

const CLOUDINARY_CLOUD_NAME = 'dy3zdsgxs';   
const CLOUDINARY_UPLOAD_PRESET = 'plato_images';    

/**
 * Opens image picker and uploads to Cloudinary.
 * @returns {string|null} public image URL, or null if cancelled/failed
 */
export const pickAndUploadImage = async () => {
    // Ask permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        alert('Camera roll permission is required to upload images.');
        return null;
    }

    // Open picker
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return null;

    const imageUri = result.assets[0].uri;

    // Upload to Cloudinary
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
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
            return data.secure_url;   // permanent HTTPS URL
        } else {
            console.error('Cloudinary error:', data);
            alert('Image upload failed. Please try again.');
            return null;
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Network error during upload.');
        return null;
    }
};