const User = require('../models/user');
const SupportTicket = require('../models/supportTicket');
const asyncHandler = require('../utils/controllerWrapper');
const { uploadImage, deleteImage } = require('../services/imageService');

const SETTINGS_VERSION = '1.0.0';
const ISSUE_CATEGORIES = [
  'detection_error',
  'maturity_misclassification',
  'disease_misclassification',
  'app_crash',
  'performance_issue',
  'other',
];

const ISSUE_CATEGORY_LABELS = {
  detection_error: 'Detection Error',
  maturity_misclassification: 'Maturity Misclassification',
  disease_misclassification: 'Disease Misclassification',
  app_crash: 'App Crash',
  performance_issue: 'Performance Issue',
  other: 'Other',
  general: 'General',
  technical: 'Technical',
  billing: 'Billing',
  feedback: 'Feedback',
};

const LUZON_GARDENS = [
  { id: 'luzon-1', name: 'Benguet Aloe Garden', region: 'La Trinidad, Benguet', coordinates: { lat: 16.4551, lng: 120.5876 } },
  { id: 'luzon-2', name: 'Ilocos Norte Aloe Hub', region: 'Laoag, Ilocos Norte', coordinates: { lat: 18.1987, lng: 120.5936 } },
  { id: 'luzon-3', name: 'Pampanga Aloe Cooperative', region: 'San Fernando, Pampanga', coordinates: { lat: 15.0343, lng: 120.6840 } },
  { id: 'luzon-4', name: 'Bulacan Aloe Farm', region: 'Malolos, Bulacan', coordinates: { lat: 14.8527, lng: 120.8160 } },
  { id: 'luzon-5', name: 'Nueva Ecija Aloe Growers', region: 'Cabanatuan, Nueva Ecija', coordinates: { lat: 15.4863, lng: 120.9674 } },
  { id: 'luzon-6', name: 'Batangas Aloe Nursery', region: 'Lipa, Batangas', coordinates: { lat: 13.9411, lng: 121.1620 } },
  { id: 'luzon-7', name: 'Laguna Aloe Plant Center', region: 'Calamba, Laguna', coordinates: { lat: 14.2117, lng: 121.1653 } },
  { id: 'luzon-8', name: 'Bicol Aloe Demo Farm', region: 'Naga, Camarines Sur', coordinates: { lat: 13.6218, lng: 123.1948 } },
];

const VISAYAS_GARDENS = [
  { id: 'visayas-1', name: 'Cebu Aloe Growers Collective', region: 'Cebu City, Cebu', coordinates: { lat: 10.3157, lng: 123.8854 } },
  { id: 'visayas-2', name: 'Iloilo Aloe Garden', region: 'Iloilo City, Iloilo', coordinates: { lat: 10.7202, lng: 122.5621 } },
  { id: 'visayas-3', name: 'Bacolod Aloe Farm', region: 'Bacolod, Negros Occidental', coordinates: { lat: 10.6765, lng: 122.9509 } },
  { id: 'visayas-4', name: 'Leyte Aloe Nursery', region: 'Tacloban, Leyte', coordinates: { lat: 11.2430, lng: 125.0048 } },
];

const MINDANAO_GARDENS = [
  { id: 'mindanao-1', name: 'Davao Aloe Development Farm', region: 'Davao City, Davao del Sur', coordinates: { lat: 7.1907, lng: 125.4553 } },
  { id: 'mindanao-2', name: 'Cagayan de Oro Aloe Farm', region: 'Cagayan de Oro, Misamis Oriental', coordinates: { lat: 8.4542, lng: 124.6319 } },
  { id: 'mindanao-3', name: 'General Santos Aloe Garden', region: 'General Santos, South Cotabato', coordinates: { lat: 6.1164, lng: 125.1716 } },
  { id: 'mindanao-4', name: 'Zamboanga Aloe Nursery', region: 'Zamboanga City, Zamboanga del Sur', coordinates: { lat: 6.9214, lng: 122.0790 } },
];

const PHILIPPINES_GARDENS = [
  ...LUZON_GARDENS,
  ...VISAYAS_GARDENS,
  ...MINDANAO_GARDENS,
];

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

const buildTicketDisplay = (ticket) => ({
  _id: ticket._id,
  ticket_number: ticket.ticket_number || '',
  issue_category: ticket.issue_category || ticket.category || 'other',
  issue_category_label:
    ISSUE_CATEGORY_LABELS[ticket.issue_category || ticket.category] || 'Other',
  description: ticket.description || ticket.message || '',
  full_name: ticket.full_name || '',
  email: ticket.email || '',
  mobile_unit: ticket.mobile_unit || '',
  os_version: ticket.os_version || '',
  issue_image_url: ticket.issue_image?.url || '',
  status: ticket.status || 'open',
  createdAt: ticket.createdAt,
});

const nextTicketNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const nextYearStart = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const yearlyCount = await SupportTicket.countDocuments({
    createdAt: { $gte: yearStart, $lt: nextYearStart },
  });

  return `ALOE-${year}-${String(yearlyCount + 1).padStart(4, '0')}`;
};

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
        cover_image_url: user.cover_image?.url || '',
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
        cover_image_url: user.cover_image?.url || '',
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

exports.updateAccountCover = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, error: 'Cover image file is required' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const uploaded = await uploadImage(req.file.buffer, 'pamada-cover');

  if (user.cover_image?.public_id) {
    await deleteImage(user.cover_image.public_id).catch(() => {});
  }

  user.cover_image = {
    url: uploaded.secure_url || '',
    public_id: uploaded.public_id || ''
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      cover_image_url: user.cover_image.url,
      user
    },
    message: 'Cover image updated successfully'
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
      issue_categories: ISSUE_CATEGORIES.map((value) => ({
        value,
        label: ISSUE_CATEGORY_LABELS[value],
      })),
      recent_tickets: tickets.map(buildTicketDisplay),
    }
  });
});

exports.createSupportTicket = asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    mobile_unit,
    os_version,
    issue_category,
    description,
  } = req.body;

  if (!full_name || !email || !mobile_unit || !os_version || !issue_category || !description) {
    return res.status(400).json({
      success: false,
      error: 'Full name, email, mobile unit, OS version, issue category, and description are required',
    });
  }

  if (!ISSUE_CATEGORIES.includes(issue_category)) {
    return res.status(400).json({ success: false, error: 'Invalid issue category' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim().toLowerCase())) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, error: 'Issue image is required' });
  }

  const uploaded = await uploadImage(req.file.buffer, 'pamada-support-tickets');

  let ticket = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketNumber = await nextTicketNumber();
    try {
      ticket = await SupportTicket.create({
        ticket_number: ticketNumber,
        user_id: req.user.id,
        full_name: String(full_name).trim(),
        email: String(email).trim().toLowerCase(),
        mobile_unit: String(mobile_unit).trim(),
        os_version: String(os_version).trim(),
        issue_category,
        description: String(description).trim(),
        issue_image: {
          url: uploaded.secure_url || '',
          public_id: uploaded.public_id || '',
        },
      });
      break;
    } catch (error) {
      const duplicateTicketNumber =
        error?.code === 11000 &&
        /ticket_number/.test(JSON.stringify(error?.keyPattern || error?.keyValue || {}));
      if (duplicateTicketNumber) {
        continue;
      }
      if (uploaded?.public_id) {
        await deleteImage(uploaded.public_id).catch(() => {});
      }
      throw error;
    }
  }

  if (!ticket) {
    if (uploaded?.public_id) {
      await deleteImage(uploaded.public_id).catch(() => {});
    }
    return res.status(503).json({
      success: false,
      error: 'Unable to allocate ticket number. Please retry.',
      code: 'TICKET_NUMBER_UNAVAILABLE',
    });
  }

  res.status(201).json({
    success: true,
    data: {
      ticket: buildTicketDisplay(ticket),
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

exports.getLuzonGardens = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      gardens: LUZON_GARDENS,
      region: {
        latitude: 15.95,
        longitude: 121.0,
        latitudeDelta: 6.8,
        longitudeDelta: 5.8,
      },
    },
  });
});

exports.getPhilippinesFarms = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      gardens: PHILIPPINES_GARDENS,
      region: {
        latitude: 12.8797,
        longitude: 121.7740,
        latitudeDelta: 14.5,
        longitudeDelta: 11.2,
      },
    },
  });
});

exports.getHomeHeroMedia = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      hero_gif_url:
        process.env.HOME_HERO_GIF_URL ||
        'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWJtZnZocGpvcWhiZW5lNjJhcDl1bWN3cDlhcDE4aXJrOWZoeWwzeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QZPxLiwj3c4G3dcnlz/giphy.gif',
    },
  });
});
