const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isGuest } = require('../middleware/auth');

// GET /auth/login - Show login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// POST /auth/login - Handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({ 
      $or: [{ email }, { username: email }] 
    });
    if (!user) {
      req.flash('error', 'Invalid username/email or password');
      return res.redirect('/auth/login');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid username/email or password');
      return res.redirect('/auth/login');
    }


    // Create session
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    };

    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during login');
    res.redirect('/auth/login');
  }
});

// GET /auth/signup - Show signup page
router.get('/signup', isGuest, (req, res) => {
  res.render('auth/signup', { title: 'Sign Up' });
});

// POST /auth/signup - Handle registration
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/signup');
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash('error', 'Email or username already exists');
      return res.redirect('/auth/signup');
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Create session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };

    req.flash('success', 'Account created successfully!');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/auth/signup');
  }
});

// GET /auth/logout - Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
