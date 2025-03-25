const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();
console.log('🔍 Loaded MongoDB URI:', process.env.MONGODB_URI);

// Ensure MongoDB URI is defined
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in your .env file');
  process.exit(1);
}

// Connect to MongoDB
connectDB()
  .then(() => console.log('✅ MongoDB Atlas connected successfully'))
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  });

// Initialize Express app
const app = express();
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Middleware
app.use(cors({
  origin: [
    'https://irt-university-frontend-fm6m-f4qorwf47-hamids-projects-e0694705.vercel.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));app.use(express.json());

// Serve static uploads
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('📂 Serving uploaded files from:', uploadsPath);

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/Posts');
const programRoutes = require('./routes/programRoutes');
const researchRoutes = require('./routes/researchRoutes');
const newsEventsRoutes = require('./routes/newsEventsRoutes');
const contactRoutes = require('./routes/contactRoutes');

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/news-events', newsEventsRoutes);
app.use('/api/contact', contactRoutes);

// Catch-all route
app.use((req, res) => {
  res.status(404).json({ message: '❌ API route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
