const { getTokenFromHeaders, verifyToken } = require('./auth');

const authenticateToken = (req, res, next) => {
  // Get token from headers
  const token = getTokenFromHeaders(req.headers);

  // Verify the token
  const decodedToken = verifyToken(token);
  if (!decodedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // If token is valid, store the decoded token in the request object
  req.decodedToken = decodedToken;

  // Call next middleware or route handler
  next();
};

module.exports = authenticateToken;
