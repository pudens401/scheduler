// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true })); // Form data
app.use(express.json()); // JSON data
app.use(cookieParser()); // Parse JWT from cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve CSS/JS
app.use('/users', userRoutes); // User routes

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Placeholder route
app.get('/', (req, res) => {
  res.render('auth/login', { title: 'Login' }); // We’ll create this later
});
app.use('/',scheduleRoutes)
app.use('/',userRoutes)
app.use('/',deviceRoutes)
app.use('/',notificationRoutes)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
