// src/api/uploadImage.js
// Uploads an image to Cloudinary and returns the public URL.
// No backend changes needed — URL is stored in meal.image field.

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