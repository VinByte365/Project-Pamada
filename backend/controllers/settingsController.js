const User = require('../models/user');
const SupportTicket = require('../models/supportTicket');
const asyncHandler = require('../utils/controllerWrapper');
const { uploadImage, deleteImage } = require('../services/imageService');

const SETTINGS_VERSION = '1.0.0';

function sanitizeNotifications(preferences = {}) {
  return {
    notification_enabled: preferences.notification_enabled !== false,
    push_notifications: preferences.push_notifications !== false,
    email_notifications: preferences.email_notifications !== false,
    disease_alert_notifications: preferences.disease_alert_notifications !== false,
    scan_reminder_notifications: preferences.scan_reminder_notifications !== false,
    weekly_report_notifications: Boolean(preferences.weekly_report_notifications),
    login_alerts: preferences.login_alerts !== false,
  };
}

function sanitizePrivacy(preferences = {}) {
  return {
    data_sharing_consent: Boolean(preferences.data_sharing_consent),
    profile_visibility: preferences.profile_visibility === 'team' ? 'team' : 'private',
    two_factor_enabled: Boolean(preferences.two_factor_enabled),
  };
}

exports.getAccountSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      account: {
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        profile_image_url: user.profile_image?.url || '',
        language: user.preferences?.language || 'en',
        location: user.preferences?.location || '',
        farm_size: user.preferences?.farm_size || ''
      }
    }
  });
});

exports.updateAccountSettings = asyncHandler(async (req, res) => {
  const { full_name, email, phone, language, location, farm_size } = req.body;

  const user = await User.findById(req.user.id);

  if (email && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing._id.toString() !== user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Email is already in use' });
    }
    user.email = email.toLowerCase();
  }

  if (full_name !== undefined) user.full_name = full_name;
  if (phone !== undefined) user.phone = phone;

  const nextPreferences = { ...(user.preferences?.toObject?.() || user.preferences || {}) };
  if (language !== undefined) nextPreferences.language = language;
  if (location !== undefined) nextPreferences.location = location;
  if (farm_size !== undefined) nextPreferences.farm_size = farm_size;

  user.preferences = nextPreferences;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      account: {
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        profile_image_url: user.profile_image?.url || '',
        language: user.preferences?.language || 'en',
        location: user.preferences?.location || '',
        farm_size: user.preferences?.farm_size || ''
      },
      user
    },
    message: 'Account settings updated successfully'
  });
});

exports.updateAccountAvatar = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, error: 'Avatar image file is required' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const uploaded = await uploadImage(req.file.buffer, 'pamada-profile');

  if (user.profile_image?.public_id) {
    await deleteImage(user.profile_image.public_id).catch(() => {});
  }

  user.profile_image = {
    url: uploaded.secure_url || '',
    public_id: uploaded.public_id || ''
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      profile_image_url: user.profile_image.url,
      user
    },
    message: 'Profile image updated successfully'
  });
});

exports.getNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      notifications: sanitizeNotifications(user.preferences || {})
    }
  });
});

exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const currentPreferences = { ...(user.preferences?.toObject?.() || user.preferences || {}) };

  user.preferences = {
    ...currentPreferences,
    ...sanitizeNotifications({ ...currentPreferences, ...req.body })
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      notifications: sanitizeNotifications(user.preferences)
    },
    message: 'Notification settings updated successfully'
  });
});

exports.getPrivacySettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      privacy: sanitizePrivacy(user.preferences || {})
    }
  });
});

exports.updatePrivacySettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const currentPreferences = { ...(user.preferences?.toObject?.() || user.preferences || {}) };

  user.preferences = {
    ...currentPreferences,
    ...sanitizePrivacy({ ...currentPreferences, ...req.body })
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      privacy: sanitizePrivacy(user.preferences)
    },
    message: 'Privacy settings updated successfully'
  });
});

exports.getHelpSupport = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user_id: req.user.id })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      contacts: {
        email: 'support@pamada.app',
        hotline: '+63 912 345 6789',
        hours: 'Monday to Saturday, 8:00 AM - 5:00 PM'
      },
      faq: [
        { question: 'How often should I scan?', answer: 'Scan each plant at least once every 7 days.' },
        { question: 'How do I improve detection accuracy?', answer: 'Use bright natural light and keep one leaf centered.' },
        { question: 'What if a scan fails?', answer: 'Retry with stable focus and check your internet connection.' }
      ],
      recent_tickets: tickets
    }
  });
});

exports.createSupportTicket = asyncHandler(async (req, res) => {
  const { subject, message, category } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, error: 'Subject and message are required' });
  }

  const allowedCategories = ['general', 'technical', 'billing', 'feedback'];
  const normalizedCategory = allowedCategories.includes(category) ? category : 'general';

  const ticket = await SupportTicket.create({
    user_id: req.user.id,
    subject,
    message,
    category: normalizedCategory
  });

  res.status(201).json({
    success: true,
    data: {
      ticket
    },
    message: 'Support request submitted successfully'
  });
});

exports.getAbout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      app_name: 'Pamada',
      version: SETTINGS_VERSION,
      ml_model: process.env.MODEL_VERSION || 'AV1.pt',
      terms_url: process.env.TERMS_URL || 'https://pamada.app/terms',
      privacy_url: process.env.PRIVACY_URL || 'https://pamada.app/privacy',
      description: 'Pamada helps growers monitor Aloe Vera health using AI-assisted disease detection.'
    }
  });
});
