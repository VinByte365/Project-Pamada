const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const imageFileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFileFilter
});

const mediaFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image or video files are allowed'), false);
  }
};

const communityUploadDir = path.join(os.tmpdir(), 'pamada-community-uploads');
if (!fs.existsSync(communityUploadDir)) {
  fs.mkdirSync(communityUploadDir, { recursive: true });
}

const communityDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, communityUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    const safeExt = ext.slice(0, 10);
    cb(null, `community-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const mediaUpload = multer({
  storage: communityDiskStorage,
  limits: {
    fileSize: parseInt(process.env.COMMUNITY_MEDIA_MAX_BYTES || `${200 * 1024 * 1024}`, 10),
  },
  fileFilter: mediaFileFilter,
});

upload.mediaUpload = mediaUpload;

module.exports = upload;

