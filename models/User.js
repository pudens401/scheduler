// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'caretaker', 'farmer'], required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  deviceId: { type: String, unique: true }, // For patient/farmer
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
