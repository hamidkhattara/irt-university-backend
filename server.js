const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is not defined in your .env file`);
    process.exit(1);
  }
}

// Initialize the application
async function startServer() {
  try {
    // Connect to MongoDB first
    const connection = await connectDB();
    console.log("✅ MongoDB Atlas connected successfully");

    // Initialize Express app after successful DB connection
    const app = express();

    app.set("trust proxy", 1);

    // ====================== SECURITY CONFIGURATION ======================
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-ancestors": [
              "'self'",
              "https://irt-university-frontend-fm6m-ol3pnrf5v-hamids-projects-e0694705.vercel.app",
              "https://irt-university-frontend-fm6m-qp4iejqk4-hamids-projects-e0694705.vercel.app",
              "http://localhost:3000",
            ],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    app.disable("x-powered-by");

    // Force HTTPS in production
    app.use((req, res, next) => {
      if (req.headers["x-forwarded-proto"] !== "https" && process.env.NODE_ENV === "production") {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });

    // ====================== CORS CONFIGURATION ======================
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : [
          "https://irt-university-frontend-fm6m-ol3pnrf5v-hamids-projects-e0694705.vercel.app",
          "https://irt-university-frontend-fm6m-qp4iejqk4-hamids-projects-e0694705.vercel.app",
          "http://localhost:3000"
        ];

    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || 
            origin.endsWith('.vercel.app') || 
            origin.endsWith('.vercel.app/')) {
          callback(null, true);
        } else {
          console.warn(`❌ CORS blocked: ${origin}`);
          callback(new Error(`CORS not allowed. Allowed origins: ${allowedOrigins.join(', ')}`));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: [
        "Content-Type", 
        "Authorization", 
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Range" // Added for file streaming support
      ],
      exposedHeaders: [
        "Content-Length",
        "Content-Range",
        "X-Content-Range",
        "Accept-Ranges", // Added for file serving
        "Content-Disposition" // Added for file downloads
      ],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 86400
    };

    // Enable CORS for all routes
    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    // ====================== RATE LIMITING ======================
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: "Too many requests from this IP, please try again later"
    });
    app.use("/api/", limiter);

    // ====================== MIDDLEWARE ======================
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
      console.log(`Incoming ${req.method} request to ${req.path} from ${req.get('origin') || 'no origin'}`);
      next();
    });

    // ====================== ROUTES ======================
    const authRoutes = require("./routes/auth");
    const postRoutes = require("./routes/Posts");
    const programRoutes = require("./routes/programRoutes");
    const researchRoutes = require("./routes/researchRoutes");
    const newsEventsRoutes = require("./routes/newsEventsRoutes");
    const contactRoutes = require("./routes/contactRoutes");
    const filesRoutes = require("./routes/files");

    // Health check endpoint
    app.get("/health", (req, res) => {
      const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
      res.status(200).json({ 
        status: "healthy",
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        allowedOrigins: allowedOrigins
      });
    });

    // API routes
    app.use("/api/auth", authRoutes);
    app.use("/api/posts", postRoutes);
    app.use("/api/programs", programRoutes);
    app.use("/api/research", researchRoutes);
    app.use("/api/news-events", newsEventsRoutes);
    app.use("/api/contact", contactRoutes);
    app.use("/api/files", filesRoutes);

    // ====================== ERROR HANDLING ======================
    app.use((err, req, res, next) => {
      if (err.message && err.message.startsWith("CORS not allowed")) {
        console.log(`CORS request blocked from: ${req.get('origin')}`);
        return res.status(403).json({ 
          error: "CORS not allowed",
          message: err.message,
          allowedOrigins: allowedOrigins
        });
      }

      console.error("🔥 ERROR:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method,
        origin: req.get('origin')
      });

      // Enhanced file-related error handling
      if (err.message.includes("FileNotFound") || err.message.includes("GridFS")) {
        return res.status(404).json({ 
          error: "File operation failed",
          message: "The requested file is not available"
        });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({ 
          error: "Validation Error",
          details: err.errors 
        });
      }

      if (err.name === "MongoError" || err.name === "MongoServerSelectionError") {
        return res.status(503).json({ 
          error: "Database service unavailable",
          message: "Please try again later"
        });
      }

      res.status(err.statusCode || 500).json({ 
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
      });
    });

    // ====================== START SERVER ======================
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("🛑 Shutting down gracefully...");
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log("📦 MongoDB connection closed");
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

startServer();