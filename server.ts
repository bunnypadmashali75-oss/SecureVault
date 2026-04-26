import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Setup storage directories
const UPLOADS_DIR = path.join(__dirname, "secure_storage");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Multer setup for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a secure key from the master key and salt using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer) {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");
}

/**
 * Encrypts a buffer
 */
function encrypt(buffer: Buffer) {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) throw new Error("ENCRYPTION_MASTER_KEY not set");

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(masterKey, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Structure: [SALT(16)][IV(12)][AUTH_TAG(16)][ENCRYPTED_DATA]
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypts a buffer
 */
function decrypt(encryptedBuffer: Buffer) {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) throw new Error("ENCRYPTION_MASTER_KEY not set");

  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const data = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(masterKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]);
}

// API Routes
app.post("/api/vault/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      return res.status(500).json({ error: "Server error: Encryption key missing" });
    }

    const encryptedData = encrypt(req.file.buffer);
    const fileId = crypto.randomUUID();
    const filePath = path.join(UPLOADS_DIR, fileId);

    fs.writeFileSync(filePath, encryptedData);

    res.json({ 
      id: fileId, 
      name: req.file.originalname, 
      size: req.file.size,
      type: req.file.mimetype 
    });
  } catch (error: any) {
    console.error("Encryption error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vault/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const filePath = path.join(UPLOADS_DIR, fileId);
    const originalName = req.query.name as string || "downloaded_file";

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const encryptedData = fs.readFileSync(filePath);
    const decryptedData = decrypt(encryptedData);

    res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`);
    res.send(decryptedData);
  } catch (error: any) {
    console.error("Decryption error:", error);
    res.status(500).json({ error: "Invalid decryption key or corrupted data" });
  }
});

app.post("/api/log-activity", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  res.json({
    ip: Array.isArray(ip) ? ip[0] : ip,
    timestamp: new Date().toISOString(),
    status: "success",
    userAgent: req.headers["user-agent"] || "unknown"
  });
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
