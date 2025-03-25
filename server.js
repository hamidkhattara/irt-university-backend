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
    const allowedOrigins = [
      "https://irt-university-frontend-fm6m-ol3pnrf5v-hamids-projects-e0694705.vercel.app",
      "http://localhost:3000",
    ];

    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`❌ CORS blocked: ${origin}`);
          callback(new Error("CORS not allowed"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    // ====================== RATE LIMITING ======================
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per window
    });
    app.use("/api/", limiter);

    // ====================== MIDDLEWARE ======================
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
      console.log(`Incoming ${req.method} request to ${req.path}`);
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
        timestamp: new Date().toISOString()
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
      console.error("🔥 ERROR:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method
      });

      if (err.name === "ValidationError") {
        return res.status(400).json({ 
          error: "Validation Error",
          details: err.errors 
        });
      }

      if (err.message.includes("FileNotFound")) {
        return res.status(404).json({ error: "Requested file not found" });
      }

      if (err.name === "MongoError") {
        return res.status(503).json({ error: "Database service unavailable" });
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