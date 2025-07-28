const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const { getDefaultDirectives } = helmet.contentSecurityPolicy;
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
    // Dynamically build allowedOrigins for CORS and CSP frame-ancestors
    // This ensures your backend uses the FRONTEND_URL and ADMIN_URL from your .env file
    const allowedOrigins = [
      "http://localhost:3000", // Always allow localhost for local development
      process.env.FRONTEND_URL, // Use the value from .env
      process.env.ADMIN_URL,    // Use the admin URL from .env if it's different and needs CORS access
      process.env.DOMAIN      // Allow the backend itself as an origin if needed (e.g., for health checks)
    ].filter(Boolean); // Filter out any undefined/null values if env vars are not set

    // Also, dynamically build baseDomains for Helmet's CSP frame-ancestors
    const baseDomains = [
      "'self'",
      "http://localhost:3000", // Allow localhost
      process.env.FRONTEND_URL, // Your main frontend URL
      process.env.ADMIN_URL,    // Your admin frontend URL
      process.env.DOMAIN        // Your backend domain
    ].filter(Boolean); // Filter out any undefined/null values

    // Add regex for Vercel preview domains and handle www/non-www for FRONTEND_URL dynamically
    if (process.env.NODE_ENV === 'production') {
      const vercelPreviewRegex = /^https:\/\/irt-university-frontend(?:-[\w.-]+)?\.vercel\.app$/;
      // Add Vercel preview regex to allowedOrigins for CORS
      if (!allowedOrigins.some(origin => origin instanceof RegExp && origin.source === vercelPreviewRegex.source)) {
        allowedOrigins.push(vercelPreviewRegex);
      }
      // Add Vercel preview regex to baseDomains for CSP
      if (!baseDomains.some(domain => domain instanceof RegExp && domain.source === vercelPreviewRegex.source)) {
        baseDomains.push(vercelPreviewRegex);
      }

      // --- NEW LOGIC TO HANDLE WWW/NON-WWW VARIANTS OF FRONTEND_URL ---
      if (process.env.FRONTEND_URL) {
        try {
          const parsedUrl = new URL(process.env.FRONTEND_URL);
          let hostname = parsedUrl.hostname;

          // Remove 'www.' if present to get the root domain
          if (hostname.startsWith('www.')) {
            hostname = hostname.substring(4);
          }

          const nonWwwUrl = `${parsedUrl.protocol}//${hostname}`;
          const wwwUrl = `${parsedUrl.protocol}//www.${hostname}`;

          // Add non-www if not already present in allowedOrigins
          if (!allowedOrigins.includes(nonWwwUrl)) {
            allowedOrigins.push(nonWwwUrl);
          }
          // Add www if not already present in allowedOrigins
          if (!allowedOrigins.includes(wwwUrl)) {
            allowedOrigins.push(wwwUrl);
          }

          // Also add to baseDomains for CSP
          if (!baseDomains.includes(nonWwwUrl)) {
            baseDomains.push(nonWwwUrl);
          }
          if (!baseDomains.includes(wwwUrl)) {
            baseDomains.push(wwwUrl);
          }

        } catch (e) {
          console.error("Error parsing FRONTEND_URL for www/non-www variants:", e.message);
        }
      }
      // --- END NEW LOGIC ---
    }

    app.use((req, res, next) => {
      const origin = req.get("origin") || "";
      
      // Helmet middleware for CSP
      if (req.path.startsWith("/api/files/")) {
        helmet({
          contentSecurityPolicy: {
            directives: {
              ...getDefaultDirectives(),
              "frame-ancestors": baseDomains, // This uses the dynamic baseDomains here
              "object-src": ["'self'", "blob:"]
            }
          },
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: { policy: "cross-origin" },
          frameguard: false
        })(req, res, next);
      } else {
        helmet()(req, res, next);
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
        if (!origin) return callback(null, true);
    
        // Check if origin is in the dynamically built allowedOrigins array or matches a regex in it
        const isAllowed = allowedOrigins.some((allowedOrigin) => {
          if (allowedOrigin instanceof RegExp) {
            return allowedOrigin.test(origin);
          }
          return origin === allowedOrigin;
        });
    
        callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
      },
    
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
      exposedHeaders: [
        'Content-Type',
        'Content-Length',
        'Content-Disposition',
        'Accept-Ranges',
        'Content-Range',
        'X-Frame-Options'
      ],
      credentials: true,
      maxAge: 86400
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));


// THIS BLOCK HAS BEEN REMOVED: (as previously discussed, it was conflicting)
/*
app.use((req, res, next) => {
  if (req.path.startsWith('/api/files/')) {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://irt-university-frontend.vercel.app https://irt-university-frontend-*.vercel.app http://localhost:3000 https://irt-university-backend.onrender.com https://www.irt-dz.org; " +
      "object-src 'self' blob: data:;"
    );
    res.removeHeader("X-Frame-Options");
  }
  next();
});;
*/
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
          allowedOrigins: allowedOrigins // This will now show the correct dynamic list
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
      app.get('/', (req, res) => {
        res.status(200).json({ 
          message: "Backend is running",
          docs: "https://github.com/hamidkhattara/irt-university-backend" 
        });
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
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
          error: "CORS not allowed",
          message: `Origin not allowed. Allowed origins: ${allowedOrigins.join(', ')}`,
          allowedOrigins: allowedOrigins
        });
      }

      console.error("🔥 ERROR:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.status(err.statusCode || 500).json({ 
        error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
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