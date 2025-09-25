// Send current datetime as ISO string in GMT+2 to MQTT
exports.setTime = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });
    const now = new Date();
    // Add 2 hours for GMT+2
    now.setHours(now.getHours() + 2);
    // Format as ISO string (local time, but with Z removed)
    const isoGmt2 = now.toISOString().replace('Z', '');
    await publish(`GD/RNG/V2/TIME/${deviceId}`, isoGmt2);
    res.json({ message: 'Current time sent (GMT+2)', time: isoGmt2 });
  } catch (err) {
    console.error('Set time error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send reset command to device via MQTT
exports.resetDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });
    await publish(`GD/RNG/V2/RESTART/${deviceId}`, 'restart');
    res.json({ message: 'Reset command sent to device' });
  } catch (err) {
    console.error('Reset device error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// controllers/deviceController.js

const Device = require('../models/Device');
const User = require('../models/User');
const { publish } = require('../utils/mqtt');

// Get own device (patient/farmer)
exports.getOwnDevice = async (req, res) => {
  try {
    const userId = req.user.id; // assume req.user from JWT middleware
    const user = await User.findById(userId);

    if (!user || !user.device) {
      return res.status(404).json({ message: 'Device not found for user' });
    }

    const device = await Device.findById(user.device);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error fetching own device:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all patient devices (caretaker only)
exports.getAllPatientDevices = async (req, res) => {
  try {
    // Confirm caretaker role
    if (req.user.role !== 'caretaker') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find all devices owned by patients
    const devices = await Device.find({ ownerType: 'patient' }).populate('owner', 'name email');

    res.json(devices);
  } catch (error) {
    console.error('Error fetching patient devices:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update food level (farmer only)
exports.updateFoodLevel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { foodLevel } = req.body;

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (typeof foodLevel !== 'number' || foodLevel < 0) {
      return res.status(400).json({ message: 'Invalid foodLevel value' });
    }

    const user = await User.findById(userId).populate('device');
    if (!user || !user.device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    user.device.foodLevel = foodLevel;
    await user.device.save();

    res.json({ message: 'Food level updated', foodLevel: user.device.foodLevel });
  } catch (error) {
    console.error('Error updating food level:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manual control trigger (farmer only)
exports.manualControl = async (req, res) => {
  try {
    const userId = req.user.id;
    const { action } = req.body;

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (typeof action !== 'string' || action.trim() === '') {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const user = await User.findById(userId).populate('device');
    if (!user || !user.device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Here you would integrate with your IoT communication layer,
    // e.g. send MQTT message or update device state in DB.
    // For now, just respond success.

    res.json({ message: `Manual control action '${action}' triggered` });
  } catch (error) {
    console.error('Error in manual control:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ringer manual action (POST)
exports.ringerAction = async (req, res) => {
  try {
    const { action, deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: 'deviceId is required' });
    }
    if (!['ring', 'silent'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Optionally persist current ringer state
    device.ringerState = action;
    await device.save();

    // Publish to MQTT topic
    const topic = action === 'ring' ? `GD/RNG/V2/RING/${deviceId}` : `GD/RNG/V2/SILENT/${deviceId}`;
    await publish(topic, `trigger:${action}`);

    return res.json({ message: `Ringer action '${action}' sent via MQTT.` });
  } catch (error) {
    console.error('Error in ringer action:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ringer manual action via GET endpoints
exports.ringGet = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).send('Device not found');

    device.ringerState = 'ring';
    await device.save();
    await publish(`GD/RNG/V2/RING/${deviceId}`, 'trigger:ring');
    res.json({ message: 'Ring command published' });
  } catch (err) {
    console.error('Ring GET error:', err);
    res.status(500).send('Server error');
  }
};

exports.silentGet = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).send('Device not found');

    device.ringerState = 'silent';
    await device.save();
    await publish(`GD/RNG/V2/SILENT/${deviceId}`, 'trigger:silent');
    res.json({ message: 'Silent command published' });
  } catch (err) {
    console.error('Silent GET error:', err);
    res.status(500).send('Server error');
  }
};
