const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!' });
});
// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide name, email and password' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already registered' 
      });
    }

    // Create user
    const user = new User({ email, password, name });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Set cookie
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide email and password' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Set cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

module.exports = router;