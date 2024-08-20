const jwt = require('jsonwebtoken');

// Middleware to authenticate token and extract user ID
function extractUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) next(); // if there's no token
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) next(); // if token is invalid
  
      req.user = user; // Save the decoded user info (e.g., id, name) to the request
      next();
    });
}

module.exports = extractUser;