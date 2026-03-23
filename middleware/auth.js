const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
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

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ 
      success: false,
      error: 'Please authenticate' 
    });
  }
};

module.exports = auth;