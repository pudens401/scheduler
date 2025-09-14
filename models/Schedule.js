// models/Schedule.js
const mongoose = require('mongoose');

const timeSchema = new mongoose.Schema(
  {
    time: { type: String, required: true }, // 'HH:mm'
    medication: { type: String }, // patient
    portion: { type: Number },    // farmer
    action: { type: String, enum: ['ring', 'silent'] }, // ringer
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  deviceId: { type: String, required: true },
  times: [timeSchema],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
