// models/Device.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  ownerType: { type: String }, // e.g., 'patient' | 'farmer' | 'ringer'
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodLevel: { type: Number, default: 0 }, // Only used for farmer
  // Optional: current ringer state
  ringerState: { type: String, enum: ['ring', 'silent'], default: 'silent' },
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
