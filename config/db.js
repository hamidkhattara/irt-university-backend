const mongoose = require('mongoose');

// Enable debug mode if MONGO_DEBUG is set to true
if (process.env.MONGO_DEBUG === 'true') {
  mongoose.set('debug', true);
}

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB connection disconnected');
});

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoReconnect: true, // Enables automatic reconnection
      reconnectTries: 3, // Number of reconnection attempts
      reconnectInterval: 1000, // Time between reconnection attempts (1 second)
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1); // Exit process on failure
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('⚠️ MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;
