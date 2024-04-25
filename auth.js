// auth.js
const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  const secretKey = process.env.JWT_SECRET || 'hgapbackend7127';
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
};

const verifyToken = (token) => {
  const secretKey = process.env.JWT_SECRET || 'hgapbackend7127';
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    return null;
  }
};

const getTokenFromHeaders = (headers) => {
  const authorizationHeader = headers['authorization'];
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    // Extract token from Authorization header
    return authorizationHeader.substring(7);
  }
  return null; // No token found
};

module.exports = { generateToken, verifyToken, getTokenFromHeaders };
