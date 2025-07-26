// models/Schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  times: { type: Array, required: false }, // e.g., "08:00"
  action: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
