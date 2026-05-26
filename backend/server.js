require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("./db");

const app = express();

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_careerlens_key_2026";

// ----------------------------------------------------
// Middlewares
// ----------------------------------------------------

app.use(cors());

app.use(express.json());

// ----------------------------------------------------
// Multer Setup
// ----------------------------------------------------

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access token is missing",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: "Invalid or expired token",
      });
    }

    req.user = user;

    next();
  });
}

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  try {
    const existing = await db.getUserByEmail(email);

    if (existing) {
      return res.status(400).json({
        error: "Email is already registered",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.createUser(email, passwordHash);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Registration successful",

      token,

      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  try {
    const user = await db.getUserByEmail(email);

    if (!user) {
      return res.status(400).json({
        error: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// CURRENT USER
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ----------------------------------------------------
// AI ANALYZE ROUTE
// ----------------------------------------------------

app.post(
  "/api/analyze",
  authenticateToken,
  upload.single("cv"),

  async (req, res) => {
    const { jobRole } = req.body;

    const file = req.file;

    if (!jobRole || jobRole.trim() === "") {
      return res.status(400).json({
        error: "Job role is required",
      });
    }

    if (!file) {
      return res.status(400).json({
        error: "PDF resume file is required",
      });
    }

    try {
      // ------------------------------------------------
      // 1. PDF TEXT EXTRACTION
      // ------------------------------------------------

      let extractedText = "";

      try {
        const uint8Array = new Uint8Array(file.buffer);
        const parser = new PDFParse({ data: uint8Array });
        const pdfData = await parser.getText();
        extractedText = pdfData.text;
        await parser.destroy();

        console.log("========== PDF TEXT ==========");
        console.log(extractedText);

      } catch (parseErr) {
        console.error("PDF Parsing error:");
        console.error(parseErr);

        return res.status(400).json({
          error: "Failed to extract text from PDF",
        });
      }

      // ------------------------------------------------
      // 2. GEMINI AI
      // ------------------------------------------------

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey.trim() === "") {
        return res.status(500).json({
          error: "Gemini API key is missing",
        });
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
You are an ATS (Applicant Tracking System) expert and recruiter.

Analyze the resume below for the target role.

TARGET ROLE:
${jobRole}

RESUME:
${extractedText}

Return ONLY valid JSON.

JSON FORMAT:
{
  "ats_score": 0,
  "suitability": "",
  "keyword_analysis": {
    "matching_keywords": [],
    "missing_keywords": []
  },
  "skill_gap": {
    "critical": [],
    "recommended": [],
    "matching": []
  },
  "feedback": {
    "structure": "",
    "content": ""
  }
}
`;

      let aiResult;

      try {
        const result = await model.generateContent(prompt);

        const response = await result.response;

        const responseText = response.text();

        console.log("========== GEMINI RAW RESPONSE ==========");
        console.log(responseText);

        const cleanedText = responseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        aiResult = JSON.parse(cleanedText);
      } catch (aiErr) {
        console.error("Gemini AI API error:");
        console.error(aiErr);

        return res.status(502).json({
          error: "AI Service failed to analyze the resume",
        });
      }

      // ------------------------------------------------
      // 3. SAVE TO DATABASE
      // ------------------------------------------------

      const savedFile = await db.saveCVFile(
        req.user.id,
        file.originalname,
        "memory_storage",
        extractedText
      );

      const savedAnalysis = await db.saveAnalysisResult(
        savedFile.id,
        jobRole,
        aiResult.ats_score,
        aiResult.suitability,
        aiResult.keyword_analysis,
        aiResult.skill_gap,
        aiResult.feedback
      );

      // ------------------------------------------------
      // RESPONSE
      // ------------------------------------------------

      res.status(200).json({
        message: "Resume analysis complete",

        analysis: {
          id: savedAnalysis.id,

          filename: file.originalname,

          job_role: jobRole,

          ats_score: aiResult.ats_score,

          suitability: aiResult.suitability,

          keyword_analysis: aiResult.keyword_analysis,

          skill_gap: aiResult.skill_gap,

          feedback: aiResult.feedback,

          created_at: savedAnalysis.created_at,
        },
      });
    } catch (err) {
      console.error("General analysis error:");
      console.error(err);

      res.status(500).json({
        error: "Internal server error during analysis",
      });
    }
  }
);

// ----------------------------------------------------
// HISTORY ROUTES
// ----------------------------------------------------

app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const history = await db.getAnalysisHistory(req.user.id);

    res.json({
      history,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to retrieve history",
    });
  }
});

app.get("/api/history/:id", authenticateToken, async (req, res) => {
  try {
    const analysis = await db.getAnalysisById(
      req.params.id,
      req.user.id
    );

    if (!analysis) {
      return res.status(404).json({
        error: "Analysis not found",
      });
    }

    res.json({
      analysis,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to retrieve analysis",
    });
  }
});

// ----------------------------------------------------
// HEALTH CHECK
// ----------------------------------------------------

app.get("/", (req, res) => {
  res.send("CareerLens AI Backend API is online");
});

// ----------------------------------------------------
// SERVER START
// ----------------------------------------------------

db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `CareerLens AI Backend server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((dbErr) => {
    console.error("Database initialization failed:");
    console.error(dbErr);

    process.exit(1);
  });