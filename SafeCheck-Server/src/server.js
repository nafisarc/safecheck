require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Load knowledge base JSON
const ingredientsKb = require("./kb/data/ingredients.json");

// Helper: normalize ingredient strings for matching
function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Build a lookup map:
// key = normalized inci OR normalized synonym
// value = ingredient object from ingredientsKb
const ingredientIndex = new Map();

for (const ing of ingredientsKb) {
  // Match the main INCI name
  ingredientIndex.set(normalize(ing.inci), ing);

  // Match synonyms too (if any)
  if (Array.isArray(ing.synonyms)) {
    for (const syn of ing.synonyms) {
      ingredientIndex.set(normalize(syn), ing);
    }
  }
}

let db;

// Connect to MongoDB and start server
async function start() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ MongoDB connected");
    db = client.db("safecheck");
    app.listen(PORT, () => console.log(`🚀 API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Mongo connection failed:", err);
  }
}
start();

// test route
app.get("/", (req, res) => {
  res.send("SafeCheck Backend is Running 🚀");
});

// --- Save or Update Profile ---
app.post("/api/profile", async (req, res) => {
  try {
    const { email, ...rest } = req.body;
    if (!email) return res.status(400).send({ error: "Email required" });

    const profiles = db.collection("profiles");
    const result = await profiles.findOneAndUpdate(
      { email },
      { $set: { email, ...rest } },
      { upsert: true, returnDocument: "after" }
    );
    res.send(result.value);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// --- Get Profile ---
app.get("/api/profile/:email", async (req, res) => {
  try {
    const data = await db.collection("profiles").findOne({ email: req.params.email });
    res.send(data || {});
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.post("/api/check", async (req, res) => {
  try {
    const { ingredients = [] } = req.body;

    const results = ingredients.map((rawName) => {
      const key = normalize(rawName);
      const match = ingredientIndex.get(key);

      if (!match) {
        return {
          input: rawName,
          status: "unknown",
          base_risk: "unknown",
          risk_notes: ["Not found in knowledge base yet."]
        };
      }

      return {
        input: rawName,
        status: "matched",
        inci: match.inci,
        base_risk: match.base_risk,
        risk_notes: match.risk_notes,
        tags: match.tags,
        cir_sources: match.cir_sources
      };
    });

    res.send({ results });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});
