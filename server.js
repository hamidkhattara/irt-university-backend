const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Ensure critical environment variables are present
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

// Connect to MongoDB
connectDB()
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed', err);
    process.exit(1);
  });

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📂 Serving uploaded images from:', path.join(__dirname, 'uploads'));

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/Posts');
const programRoutes = require('./routes/programRoutes');
const researchRoutes = require('./routes/researchRoutes');
const newsEventsRoutes = require('./routes/newsEventsRoutes');
const contactRoutes = require('./routes/contactRoutes'); // ✅ Add this earlier

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/news-events', newsEventsRoutes);
app.use('/api/contact', contactRoutes); // ✅ Proper prefix path

// Fallback route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ message: '❌ API route not found' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
