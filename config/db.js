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
      serverSelectionTimeoutMS: 5000, // How long to wait for server selection
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maximum number of sockets in the connection pool
      retryWrites: true, // Enable retryable writes
      retryReads: true, // Enable retryable reads
      connectTimeoutMS: 10000 // Give up initial connection after 10 seconds
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