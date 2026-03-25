import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";

const app = express();
const FILE = "/data/data.json";

app.use(cors({
  origin: [
    "https://datacatalog-server.vercel.app",
    "http://localhost:5173"
  ]
}));
app.use(express.json({ limit: "20mb" }));

// GET — load persisted state
app.get("/api/data", (req, res) => {
  if (!existsSync(FILE)) return res.json(null);
  try {
    const raw = readFileSync(FILE, "utf8");
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error("Failed to read data.json:", e);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// POST — save full state
app.post("/api/data", (req, res) => {
  try {
    writeFileSync(FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    console.error("Failed to write data.json:", e);
    res.status(500).json({ error: "Failed to save data" });
  }
});

const PORT = process.env.PORT || 3001;
createServer(app).listen(PORT, () => {
  console.log(`✓ DataCatalog server running on http://localhost:${PORT}`);
  console.log(`  Data file: ${existsSync(FILE) ? FILE + " (existing)" : FILE + " (will be created on first save)"}`);
});
