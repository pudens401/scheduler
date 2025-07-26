// controllers/scheduleController.js

const Schedule = require('../models/Schedule');
const Device = require('../models/Device');

// Get schedule by deviceId (deviceId is the Device.deviceId string)
exports.getScheduleByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Find device by deviceId string
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Find schedule by device _id
    const schedule = await Schedule.findOne({ device: device._id });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update schedule by deviceId
exports.updateScheduleByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { times, action } = req.body;

    // Validate inputs (basic)
    if (!Array.isArray(times)) {
      return res.status(400).json({ message: '`times` must be an array' });
    }
    if (typeof action !== 'string') {
      return res.status(400).json({ message: '`action` must be a string' });
    }

    // Find device
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Find schedule by device _id
    let schedule = await Schedule.findOne({ device: device._id });
    if (!schedule) {
      // Optionally create a new schedule if none exists (shouldn't happen if auto-created)
      schedule = new Schedule({ device: device._id, times, action });
    } else {
      // Update fields
      schedule.times = times;
      schedule.action = action;
    }

    await schedule.save();
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
