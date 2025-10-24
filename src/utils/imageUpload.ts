// imageUpload.ts
// Utility functions for uploading images to Supabase Storage
// Used for reverse image search to convert local files to public URLs

import { supabase } from '../lib/supabase';
import { logger } from './logger';

const BUCKET_NAME = 'reverse-image-searches';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Uploads an image file to Supabase Storage and returns the public URL
 * @param file Image file to upload
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    logger.info('Uploading image to Supabase Storage', { 
      fileName, 
      fileSize: file.size,
      fileType: file.type
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      logger.error('Image upload failed', { error: error.message });
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    logger.info('Image uploaded successfully', { 
      publicUrl,
      path: data.path
    });

    return publicUrl;

  } catch (error) {
    logger.error('Image upload error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Uploads multiple images and returns their public URLs
 * @param files Array of image files to upload
 * @returns Array of public URLs
 */
export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  logger.info('Uploading multiple images', { count: files.length });

  const uploadPromises = files.map(file => uploadImageToStorage(file));
  
  try {
    const urls = await Promise.all(uploadPromises);
    logger.info('Multiple images uploaded successfully', { count: urls.length });
    return urls;
  } catch (error) {
    logger.error('Multiple image upload failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param publicUrl Public URL of the image to delete
 */
export async function deleteImageFromStorage(publicUrl: string): Promise<void> {
  try {
    // Extract path from public URL
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/${BUCKET_NAME}/`);
    if (pathParts.length < 2) {
      throw new Error('Invalid public URL format');
    }
    const filePath = pathParts[1];

    logger.info('Deleting image from Supabase Storage', { filePath });

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      logger.error('Image deletion failed', { error: error.message });
      throw new Error(`Deletion failed: ${error.message}`);
    }

    logger.info('Image deleted successfully', { filePath });

  } catch (error) {
    logger.error('Image deletion error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw - deletion failure shouldn't block the workflow
  }
}
