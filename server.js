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
    // Connect to MongoDB
    const connection = await connectDB();
    console.log("✅ MongoDB Atlas connected successfully");

    // Initialize Express app
    const app = express();

    // Trust first proxy
    app.set("trust proxy", 1);

    // ====================== SECURITY CONFIGURATION ======================
    const allowedOrigins = [
      "https://irt-university-frontend.vercel.app",
      "https://irt-university-frontend-*.vercel.app",
      "http://localhost:3000",
      "https://irt-university-backend.onrender.com" // Add backend domain for PDF embedding
    ];

    // Enhanced CSP configuration for PDF support
    app.use((req, res, next) => {
      // Bypass CSP for PDF files
      if (req.path.startsWith('/api/files/') && req.query.type === 'pdf') {
        helmet({
          contentSecurityPolicy: false, // Disable CSP completely for PDF requests
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: { policy: "cross-origin" }
        })(req, res, next);
      } else {
        helmet({
          contentSecurityPolicy: {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              "frame-ancestors": [
                "'self'",
                ...allowedOrigins
              ],
              "img-src": ["'self'", "data:", "blob:", "https://*.youtube.com"],
              "media-src": ["'self'", "data:", "blob:"],
              "connect-src": ["'self'", ...allowedOrigins],
              "object-src": ["'self'", "data:", "blob:"]
            }
          },
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: { policy: "cross-origin" }
        })(req, res, next);
      }
    });

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
    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // Allow direct file access
        
        const isAllowed = allowedOrigins.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
            return regex.test(origin);
          }
          return origin === pattern;
        });

        callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
      exposedHeaders: [
        'Content-Type',
        'Content-Length',
        'Content-Disposition',
        'Accept-Ranges',
        'Content-Range',
        'X-Frame-Options' // Important for PDF embedding
      ],
      credentials: true,
      maxAge: 86400
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    // ====================== BODY PARSING ======================
    app.use(express.json({ 
      limit: "50mb",
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
      limit: "50mb",
      parameterLimit: 100000
    }));

    // ====================== RATE LIMITING ======================
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: {
        error: "Too many requests",
        message: "Please try again after 15 minutes"
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    app.use("/api/", apiLimiter);

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

    // Health check endpoint
    app.get("/health", async (req, res) => {
      try {
        await mongoose.connection.db.admin().ping();
        res.status(200).json({ 
          status: "healthy",
          database: "connected",
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          allowedOrigins: allowedOrigins
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
    app.use((req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `The requested resource ${req.originalUrl} was not found`
      });
    });

    // Main error handler
    app.use((err, req, res, next) => {
      // Handle CORS errors
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
          error: "CORS not allowed",
          message: `Origin not allowed. Allowed origins: ${allowedOrigins.join(', ')}`,
          allowedOrigins: allowedOrigins
        });
      }

      // Log the error
      console.error("🔥 ERROR:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Determine status code and message
      let status = err.statusCode || 500;
      let message = process.env.NODE_ENV === "development" ? err.message : "Something went wrong";

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

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`🛑 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🔒 HTTP server closed');
        await mongoose.connection.close(false);
        console.log('📦 MongoDB connection closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⚠️ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown('SIGTERM'));
    process.on("SIGINT", () => shutdown('SIGINT'));
    process.on("unhandledRejection", (err) => {
      console.error('⚠️ Unhandled Rejection:', err);
      shutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

startServer();