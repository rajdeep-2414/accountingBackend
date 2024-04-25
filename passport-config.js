// passport-config.js
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { verifyToken } = require('./auth');
require('dotenv').config();

const secretKey = process.env.JWT_SECRET || 'hgapbackend7127';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretKey
};

module.exports = (passport) => {
  passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      console.log('Payload:', payload); // Log the payload received
      const user = await verifyToken(payload); // Assuming verifyToken function is correct
      console.log('User:', user); // Log the user object after verification
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      console.error('Error verifying token:', error); // Log any verification errors
      return done(error, false);
    }
  }));
};
