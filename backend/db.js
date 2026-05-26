const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let pool = null;
let useJsonFallback = false;
const JSON_DB_PATH = path.join(__dirname, "local_db.json");

// Helper to read/write JSON db
function readJsonDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialData = {
      users: [],
      cv_files: [],
      analysis_results: []
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
  const data = fs.readFileSync(JSON_DB_PATH, "utf8");
  return JSON.parse(data);
}

function writeJsonDb(data) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// Initialize database
async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.trim() !== "" && dbUrl !== "your_postgres_connection_string_here") {
    try {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
      });
      // Test connection
      await pool.query("SELECT NOW()");
      console.log("Successfully connected to PostgreSQL database!");
      
      // Create tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cv_files (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          extracted_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS analysis_results (
          id SERIAL PRIMARY KEY,
          cv_file_id INTEGER REFERENCES cv_files(id) ON DELETE CASCADE,
          job_role VARCHAR(255) NOT NULL,
          ats_score INTEGER NOT NULL,
          suitability TEXT,
          keyword_analysis JSONB,
          skill_gap JSONB,
          feedback JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log("PostgreSQL tables successfully verified/created.");
      return;
    } catch (err) {
      console.warn("Failed to connect to PostgreSQL. Falling back to local JSON database...", err.message);
      useJsonFallback = true;
    }
  } else {
    console.log("No valid DATABASE_URL provided. Using zero-configuration local JSON database fallback.");
    useJsonFallback = true;
  }

  if (useJsonFallback) {
    readJsonDb(); // Ensures file is created
    console.log(`Local JSON database initialized at: ${JSON_DB_PATH}`);
  }
}

// Database Operations
async function createUser(email, passwordHash) {
  if (!useJsonFallback) {
    const res = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase(), passwordHash]
    );
    return res.rows[0];
  } else {
    const db = readJsonDb();
    const existing = db.users.find(u => u.email === email.toLowerCase());
    if (existing) {
      throw new Error("duplicate key value violates unique constraint");
    }
    const newUser = {
      id: db.users.length + 1,
      email: email.toLowerCase(),
      password: passwordHash,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    writeJsonDb(db);
    return { id: newUser.id, email: newUser.email, created_at: newUser.created_at };
  }
}

async function getUserByEmail(email) {
  if (!useJsonFallback) {
    const res = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return res.rows[0];
  } else {
    const db = readJsonDb();
    return db.users.find(u => u.email === email.toLowerCase()) || null;
  }
}

async function saveCVFile(userId, filename, filePath, extractedText) {
  if (!useJsonFallback) {
    const res = await pool.query(
      "INSERT INTO cv_files (user_id, filename, file_path, extracted_text) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, filename, filePath, extractedText]
    );
    return res.rows[0];
  } else {
    const db = readJsonDb();
    const newFile = {
      id: db.cv_files.length + 1,
      user_id: Number(userId),
      filename,
      file_path: filePath,
      extracted_text: extractedText,
      created_at: new Date().toISOString()
    };
    db.cv_files.push(newFile);
    writeJsonDb(db);
    return newFile;
  }
}

async function saveAnalysisResult(cvFileId, jobRole, atsScore, suitability, keywordAnalysis, skillGap, feedback) {
  if (!useJsonFallback) {
    const res = await pool.query(
      "INSERT INTO analysis_results (cv_file_id, job_role, ats_score, suitability, keyword_analysis, skill_gap, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [cvFileId, jobRole, atsScore, suitability, JSON.stringify(keywordAnalysis), JSON.stringify(skillGap), JSON.stringify(feedback)]
    );
    return res.rows[0];
  } else {
    const db = readJsonDb();
    const newAnalysis = {
      id: db.analysis_results.length + 1,
      cv_file_id: Number(cvFileId),
      job_role: jobRole,
      ats_score: Number(atsScore),
      suitability,
      keyword_analysis: keywordAnalysis,
      skill_gap: skillGap,
      feedback: feedback,
      created_at: new Date().toISOString()
    };
    db.analysis_results.push(newAnalysis);
    writeJsonDb(db);
    return newAnalysis;
  }
}

async function getAnalysisHistory(userId) {
  if (!useJsonFallback) {
    const res = await pool.query(`
      SELECT ar.*, cv.filename, cv.created_at as file_created_at
      FROM analysis_results ar
      JOIN cv_files cv ON ar.cv_file_id = cv.id
      WHERE cv.user_id = $1
      ORDER BY ar.created_at DESC
    `, [userId]);
    return res.rows;
  } else {
    const db = readJsonDb();
    const userFiles = db.cv_files.filter(f => f.user_id === Number(userId));
    const fileIds = userFiles.map(f => f.id);
    const results = db.analysis_results
      .filter(ar => fileIds.includes(ar.cv_file_id))
      .map(ar => {
        const file = userFiles.find(f => f.id === ar.cv_file_id);
        return {
          ...ar,
          filename: file.filename,
          file_created_at: file.created_at
        };
      });
    return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

async function getAnalysisById(analysisId, userId) {
  if (!useJsonFallback) {
    const res = await pool.query(`
      SELECT ar.*, cv.filename, cv.created_at as file_created_at, cv.extracted_text
      FROM analysis_results ar
      JOIN cv_files cv ON ar.cv_file_id = cv.id
      WHERE ar.id = $1 AND cv.user_id = $2
    `, [analysisId, userId]);
    return res.rows[0] || null;
  } else {
    const db = readJsonDb();
    const ar = db.analysis_results.find(x => x.id === Number(analysisId));
    if (!ar) return null;
    const file = db.cv_files.find(f => f.id === ar.cv_file_id && f.user_id === Number(userId));
    if (!file) return null;
    return {
      ...ar,
      filename: file.filename,
      file_created_at: file.created_at,
      extracted_text: file.extracted_text
    };
  }
}

module.exports = {
  initDb,
  createUser,
  getUserByEmail,
  saveCVFile,
  saveAnalysisResult,
  getAnalysisHistory,
  getAnalysisById
};
