const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Ensure MongoDB URI is defined
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in your .env file");
  process.exit(1);
}

// Connect to MongoDB
connectDB()
  .then(() => console.log("✅ MongoDB Atlas connected successfully"))
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB Atlas:", err.message);
    process.exit(1);
  });

// Initialize Express app
const app = express();

app.set("trust proxy", 1); // ✅ Fix for express-rate-limit

// Security Middleware
app.use(helmet());
app.disable("x-powered-by");

// Force HTTPS in production
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https" && process.env.NODE_ENV === "production") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ✅ CORS Configuration (Fixed)
const allowedOrigins = [
  "https://irt-university-frontend.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Rate Limiting (Prevents DDoS attacks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use("/api/", limiter);

// Middleware
app.use(express.json({ limit: "10mb" }));

// Static Files (Uploads with HTTPS enforcement)
app.use(
  "/uploads",
  (req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https" && process.env.NODE_ENV === "production") {
      return res.redirect(301, `https://${req.get("host")}${req.url}`);
    }
    next();
  },
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/Posts");
const programRoutes = require("./routes/programRoutes");
const researchRoutes = require("./routes/researchRoutes");
const newsEventsRoutes = require("./routes/newsEventsRoutes");
const contactRoutes = require("./routes/contactRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/news-events", newsEventsRoutes);
app.use("/api/contact", contactRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
