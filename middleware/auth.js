// Authentication Middleware - Check if user is logged in

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error', 'Please login to continue');
  res.redirect('/auth/login');
};

const isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  res.redirect('/');
};

const isAdmin = (req, res, next) => {
  if (req.session.user) {
    // 1. MASTER KEY: Always allow 'bhavi12z'
    if (req.session.user.username === 'bhavi12z') {
      return next();
    }

    // 2. DATABASE ROLE CHECK: Allow if they were promoted to admin
    if (req.session.user.role === 'admin') {
      return next();
    }
  }

  req.flash('error', 'Access Denied: Restricted Area');
  res.redirect('/');
};



module.exports = { isAuthenticated, isGuest, isAdmin };