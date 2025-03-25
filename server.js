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

// ====================== SECURITY CONFIGURATION ======================
// ✅ Custom CSP with frame-ancestors for iframe embedding
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
    crossOriginEmbedderPolicy: false, // ✅ Required for some cross-origin embeds
  })
);

app.disable("x-powered-by"); // ✅ Hide Express server info

// ✅ Force HTTPS in production
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
app.options("*", cors(corsOptions)); // ✅ Handle Preflight Requests

// ====================== RATE LIMITING ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use("/api/", limiter);

// ====================== MIDDLEWARE ======================
app.use(express.json({ limit: "10mb" }));

// ✅ Static Files (Uploads with proper CORS headers)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// ====================== ROUTES ======================
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

// ====================== HEALTH CHECK ======================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// ====================== ERROR HANDLING ======================
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});