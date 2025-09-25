// controllers/UserController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');
const Schedule = require('../models/Schedule');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const SALT_ROUNDS = 10;

// Helper: create JWT
function createToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
}

// Signup controller
// Show signup form
function showSignupForm(req, res) {
  res.render('auth/signup', { error: null });
}

// Signup POST (EJS version)
async function signup(req, res) {
  try {
    const { name, email, password, role, deviceId } = req.body;

    if (!name || !email || !password || !role) {
      return res.render('auth/signup', { error: 'Missing required fields' });
    }

    // Allow ringer
    if (!['patient', 'caretaker', 'farmer', 'ringer'].includes(role)) {
      return res.render('auth/signup', { error: 'Invalid role' });
    }

    // Require device for patient/farmer/ringer
    if ((role === 'patient' || role === 'farmer' || role === 'ringer') && !deviceId) {
      return res.render('auth/signup', { error: 'Device ID is required for patient/farmer/ringer' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/signup', { error: 'Email already registered' });
    }

    if (role === 'patient' || role === 'farmer' || role === 'ringer') {
      const existingDevice = await Device.findOne({ deviceId });
      if (existingDevice) {
        return res.render('auth/signup', { error: 'Device ID already in use' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword, role, deviceId });
    await user.save();

    if (role === 'patient' || role === 'farmer' || role === 'ringer') {
      const device = new Device({
        deviceId,
        ownerType: role,
        owner: user._id,
        foodLevel: role === 'farmer' ? 0 : undefined,
      });
      await device.save();

      user.device = device._id;
      await user.save();

      const times =
        role === 'farmer'
          ? [
              { time: '08:00', portion: 300 },
              { time: '12:00', portion: 700 },
              { time: '18:00', portion: 500 },
            ]
          : role === 'patient'
          ? [
              { time: '08:00', medication: 'default' },
              { time: '12:00', medication: 'default' },
              { time: '18:00', medication: 'default' },
            ]
          : [
              { time: '08:00', action: 'ring' },
              { time: '12:00', action: 'ring' },
              { time: '18:00', action: 'silent' },
            ];

      const schedule = new Schedule({
        device: device._id,
        deviceId: device.deviceId,
        times,
        owner: user._id,
        action: '',
      });
      await schedule.save();
    }

    const token = createToken(user);
    res.cookie('token', token, { httpOnly: true });

    // Redirect by role
    if (user.role === 'patient') {
      return res.redirect(`/dashboard/patient/${user._id}`);
    } else if (user.role === 'farmer') {
      return res.redirect(`/dashboard/farmer/${user._id}`);
    } else if (user.role === 'caretaker') {
      return res.redirect(`/dashboard/caretaker/${user._id}`);
    } else if (user.role === 'ringer') {
      return res.redirect(`/dashboard/ringer/${user._id}`);
    } else {
      return res.redirect('/');
    }
  } catch (err) {
    console.error('Signup error:', err);
    return res.render('auth/signup', { error: 'Server error' });
  }
}

// Render login form (GET)
function showLoginForm(req, res) {
  res.render('auth/login', { error: null }); // Always define `error`
}

// Handle login (POST)
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('auth/login', { error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.render('auth/login', { error: 'Invalid credentials' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.render('auth/login', { error: 'Invalid credentials' });

    const token = createToken(user);

    // Store token in a cookie
    res.cookie('token', token, { httpOnly: true });

    // Redirect based on role
    if (user.role === 'patient') {
      return res.redirect(`/dashboard/patient/${user._id}`);
    } else if (user.role === 'farmer') {
      return res.redirect(`/dashboard/farmer/${user._id}`);
    } else if (user.role === 'caretaker') {
      return res.redirect(`/dashboard/caretaker/${user._id}`);
    } else if (user.role === 'ringer') {
      return res.redirect(`/dashboard/ringer/${user._id}`);
    } else {
      return res.redirect('/');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', { error: 'Server error' });
  }
}

// Get profile controller
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password').populate('device', '-__v -createdAt -updatedAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Update profile controller
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { name, email, password } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      // Check for email uniqueness
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(409).json({ error: 'Email already in use' });
      user.email = email;
    }

    if (name) user.name = name;
    if (password) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      user.password = hashed;
    }

    await user.save();

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Get all patients controller (caretaker only)
async function getAllPatients(req, res) {
  try {
    if (req.user.role !== 'caretaker') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find all patient users with their devices
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .populate('device', '-__v -createdAt -updatedAt');

    res.json(patients);
  } catch (err) {
    console.error('Get all patients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Logout controller
function logout(req, res) {
  res.clearCookie('token');
  res.redirect('/users/login');
}

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  getAllPatients,
  showLoginForm,
  showSignupForm
};
