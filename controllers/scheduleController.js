// controllers/scheduleController.js

const Schedule = require('../models/Schedule');
const Device = require('../models/Device');
const { publish } = require('../utils/mqtt');

// Get schedule by deviceId (deviceId is the Device.deviceId string)
exports.getScheduleByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const schedule = await Schedule.findOne({ deviceId });
    return res.json(schedule || { deviceId, times: [] });
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getScheduleByDeviceData = async (deviceId) => {
  const device = await Device.findOne({ deviceId });
  if (!device) return { times: [] };
  const schedule = await Schedule.findOne({ device: device._id });
  if (!schedule) return { times: [] };
  return schedule; // Return raw schedule document
};


// Update schedule by deviceId
exports.updateScheduleByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { times } = req.body; // array of { time, medication? portion? action? }

    if (!Array.isArray(times)) {
      return res.status(400).json({ message: 'times must be an array' });
    }

    const normalized = times.map(t => ({
      time: t.time,
      medication: t.medication,
      portion: t.portion,
      action: t.action,
    }));

    const schedule = await Schedule.findOneAndUpdate(
      { deviceId },
      { $set: { times: normalized } },
      { upsert: true, new: true }
    );

    // Publish the same object as getScheduleByDevice response to MQTT for schedule updates
    try {
      await publish(`GD/RNG/V2/SCHEDULE/${deviceId}`, { deviceId, times: normalized });
    } catch (e) {
      console.error('MQTT publish (schedule) failed:', e.message);
    }

    res.json({ message: 'Schedule updated', schedule });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
