// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, default: 'info' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
