const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const defaultImageTransform = {
  quality: 'auto',
  fetch_format: 'auto',
  dpr: 'auto',
};

const buildImageUrl = (publicId, overrides = {}) =>
  cloudinary.url(publicId, {
    transformation: [
      {
        ...defaultImageTransform,
        ...overrides,
      },
    ],
  });

const buildVideoUrl = (publicId, overrides = {}) =>
  cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto',
        video_codec: 'auto',
        ...overrides,
      },
    ],
  });

// Upload image to Cloudinary
exports.uploadImage = async (buffer, folder = 'aloe-vera-scans') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

exports.uploadMedia = async (
  buffer,
  folder = 'aloe-vera-community',
  options = {}
) => {
  const explicitType = options.resource_type || 'auto';
  const mergedOptions = {
    folder,
    resource_type: explicitType,
    timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '600000', 10),
    ...options,
  };

  if (explicitType === 'image') {
    mergedOptions.quality = mergedOptions.quality || 'auto';
    mergedOptions.fetch_format = mergedOptions.fetch_format || 'auto';
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      mergedOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

exports.uploadMediaFromPath = async (
  filePath,
  folder = 'aloe-vera-community',
  options = {}
) => {
  const explicitType = options.resource_type || 'auto';
  const mergedOptions = {
    folder,
    resource_type: explicitType,
    timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '600000', 10),
    ...options,
  };

  if (explicitType === 'image') {
    mergedOptions.quality = mergedOptions.quality || 'auto';
    mergedOptions.fetch_format = mergedOptions.fetch_format || 'auto';
  }

  return cloudinary.uploader.upload(filePath, mergedOptions);
};

// Generate thumbnail
exports.generateThumbnail = async (publicId) => {
  return buildImageUrl(publicId, {
    width: 300,
    height: 300,
    crop: 'fill',
    gravity: 'auto',
  });
};

exports.generateOptimizedImageUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  return buildImageUrl(publicId, {
    width: options.width || 1280,
    crop: options.crop || 'limit',
  });
};

exports.generatePreviewImageUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  return buildImageUrl(publicId, {
    width: options.width || 720,
    crop: options.crop || 'limit',
  });
};

exports.generateOptimizedVideoUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  return buildVideoUrl(publicId, {
    width: options.width || 1280,
    crop: options.crop || 'limit',
  });
};

exports.generateVideoPosterUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto',
        start_offset: 'auto',
        width: options.width || 640,
        crop: options.crop || 'limit',
      },
    ],
  });
};

// Delete image from Cloudinary
exports.deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

exports.deleteMedia = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image',
    });
    return result;
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
};

