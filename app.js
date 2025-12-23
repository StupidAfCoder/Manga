// Main Application Entry Point
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuration with fallbacks for CodeSandbox/deployment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mangaverse';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mangaverse-dev-secret-' + Math.random().toString(36);
const PORT = process.env.PORT || 3000;

// Database Connection
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Auto-seed database if empty
    try {
      const Manga = require('./models/Manga');
      const mangaCount = await Manga.countDocuments();
      
      if (mangaCount === 0) {
        console.log('📦 Database is empty, seeding initial data...');
        const seedDatabase = require('./config/autoSeed');
        await seedDatabase();
        console.log('✅ Database seeded successfully');
      }
    } catch (seedErr) {
      console.log('⚠️ Auto-seed check failed (ignoring):', seedErr.message);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('\n📝 Setup Help:');
    console.error('   1. Start MongoDB: sudo systemctl start mongod');
    console.error('   2. Check status: sudo systemctl status mongod');
    console.error('   3. Verify connection string in .env file\n');
    process.exit(1);
  });

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session Configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Flash Messages
app.use(flash());

// Global Variables for Templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// ==========================================
// ✅ ROUTES
// ==========================================
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/manga', require('./routes/manga'));
app.use('/discussions', require('./routes/discussions'));

// Admin Routes (Moved UP so it is reachable)
const adminRoutes = require('./routes/admin'); 
app.use('/admin', adminRoutes);

// ==========================================
// ⛔ 404 Handler (Must be AFTER all routes)
// ==========================================
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    currentUser: req.session.user || null,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error', 
    message: err.message,
    currentUser: req.session.user || null,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});