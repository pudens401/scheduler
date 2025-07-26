// models/Schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  deviceId: { type: String, required: true }, // Store deviceId for easy access
  times: { type: Array, required: false }, // e.g., "08:00"
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String}
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
