const mongoose = require('mongoose');

/**
 * UserSettings Schema
 * Stores user-specific settings that persist across sessions
 */
const UserSettingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  settings: {
    type: Object,
    default: {
      theme: 'light',
      fontSize: 'medium',
      notifications: true,
      autoSave: true,
      presentationViewMode: 'embed',
      lastVisitedSection: null
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const UserSettings = mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema);

// Export both the model and schema for reuse
module.exports = {
  UserSettings,
  UserSettingsSchema
};
