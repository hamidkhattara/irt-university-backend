const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`) });

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'PORT', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is not defined in your .env file`);
    process.exit(1);
  }
}

// Initialize the application
async function startServer() {
  try {
    // Connect to MongoDB with enhanced error handling
    const connection = await connectDB();
    console.log("✅ MongoDB Atlas connected successfully");

    // Initialize Express app after successful DB connection
    const app = express();

    // Trust first proxy (important for rate limiting and secure cookies in production)
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
            "img-src": ["'self'", "data:", "https://img.youtube.com", "https://via.placeholder.com"],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" } // Needed for file downloads
      })
    );

    app.disable("x-powered-by");

    // Force HTTPS in production
    if (process.env.NODE_ENV === "production") {
      app.use((req, res, next) => {
        if (req.headers["x-forwarded-proto"] !== "https") {
          return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
      });
    }

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
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin && process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin) || 
            origin?.endsWith('.vercel.app') || 
            origin?.endsWith('.vercel.app/')) {
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
        "Range"
      ],
      exposedHeaders: [
        "Content-Length",
        "Content-Range",
        "X-Content-Range",
        "Accept-Ranges",
        "Content-Disposition",
        "X-Filename" // For file downloads
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
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Different limits for prod/dev
      message: {
        error: "Too many requests",
        message: "Please try again after 15 minutes"
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // Apply to API routes only
    app.use("/api/", apiLimiter);

    // ====================== MIDDLEWARE ======================
    app.use(express.json({ 
      limit: "10mb",
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          throw new Error("Invalid JSON payload");
        }
      }
    }));
    
    app.use(express.urlencoded({ 
      extended: true,
      limit: "10mb",
      parameterLimit: 10000 
    }));

    // Enhanced request logging
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} ${duration}ms`);
      });
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

    // Health check endpoint with DB ping
    app.get("/health", async (req, res) => {
      try {
        await mongoose.connection.db.admin().ping();
        res.status(200).json({ 
          status: "healthy",
          database: "connected",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (err) {
        res.status(503).json({
          status: "unhealthy",
          database: "disconnected",
          error: err.message
        });
      }
    });

    // API routes
    app.use("/api/auth", authRoutes);
    app.use("/api/posts", postRoutes);
    app.use("/api/programs", programRoutes);
    app.use("/api/research", researchRoutes);
    app.use("/api/news-events", newsEventsRoutes);
    app.use("/api/contact", contactRoutes);
    app.use("/api/files", filesRoutes);

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, 'client/build')));
      
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
      });
    }

    // ====================== ERROR HANDLING ======================
    // 404 Handler
    app.use((req, res, next) => {
      res.status(404).json({
        error: "Not Found",
        message: `The requested resource ${req.originalUrl} was not found`
      });
    });

    // Main error handler
    app.use((err, req, res, next) => {
      // Handle CORS errors
      if (err.message && err.message.startsWith("CORS not allowed")) {
        return res.status(403).json({ 
          error: "CORS not allowed",
          message: err.message,
          allowedOrigins: allowedOrigins
        });
      }

      // Log the error with more context
      console.error("🔥 ERROR:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        body: req.body,
        headers: req.headers
      });

      // Handle different error types
      let status = err.statusCode || 500;
      let message = process.env.NODE_ENV === "development" ? err.message : "Something went wrong";

      if (err.name === "ValidationError") {
        status = 400;
        message = "Validation Error";
      } else if (err.name === "MongoError") {
        status = 503;
        message = "Database service unavailable";
      } else if (err.message.includes("FileNotFound") || err.message.includes("GridFS")) {
        status = 404;
        message = "The requested file is not available";
      } else if (err.message.includes("Invalid JSON payload")) {
        status = 400;
        message = "Invalid JSON payload";
      }

      res.status(status).json({ 
        error: message,
        ...(process.env.NODE_ENV === "development" && { details: err.stack })
      });
    });

    // ====================== START SERVER ======================
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`🌍 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    });

    // Enhanced server shutdown handling
    const shutdown = async (signal) => {
      console.log(`🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Close the server first
        server.close(async () => {
          console.log('🔒 HTTP server closed');
          
          // Close MongoDB connection
          await mongoose.connection.close(false);
          console.log('📦 MongoDB connection closed');
          
          process.exit(0);
        });

        // Force shutdown if graceful shutdown takes too long
        setTimeout(() => {
          console.error('⚠️ Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on("SIGTERM", () => shutdown('SIGTERM'));
    process.on("SIGINT", () => shutdown('SIGINT'));
    process.on("unhandledRejection", (err) => {
      console.error('⚠️ Unhandled Rejection:', err);
      shutdown('unhandledRejection');
    });
    process.on("uncaughtException", (err) => {
      console.error('⚠️ Uncaught Exception:', err);
      shutdown('uncaughtException');
    });

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

startServer();