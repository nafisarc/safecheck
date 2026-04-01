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

const rules = require("./kb/data/rules.json");

function riskMax(a, b) {
  const rank = rules.risk_rank;
  return rank[b] > rank[a] ? b : a;
}

// profileFlags can come as ["sensitive","rosacea"] etc.
// or as an object { sensitive:true, rosacea:true }
function getActiveFlags(profileFlags, profileObj) {
  if (Array.isArray(profileFlags)) return profileFlags;

  // if profile is an object with booleans
  if (profileObj && typeof profileObj === "object") {
    return Object.keys(rules.profile_rules).filter((k) => profileObj[k] === true);
  }

  return [];
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
    const { ingredients = [], profileFlags, profile } = req.body;

    const activeFlags = getActiveFlags(profileFlags, profile);

    const results = ingredients.map((rawName) => {
      const key = normalize(rawName);
      const match = ingredientIndex.get(key);

      if (!match) {
        return {
          input: rawName,
          status: "unknown",
          final_risk: "unknown",
          reasons: ["Not found in knowledge base yet."]
        };
      }

      let finalRisk = match.base_risk || "caution";
      const reasons = [];

      // apply rules per user flag
      for (const flag of activeFlags) {
        const rule = rules.profile_rules[flag];
        if (!rule) continue;

        const tags = match.tags || [];

        const hitHigh = (rule.to_high_if_tags || []).some((t) => tags.includes(t));
        const hitCaution = (rule.to_caution_if_tags || []).some((t) => tags.includes(t));

        if (hitHigh) {
          finalRisk = riskMax(finalRisk, "high");
          reasons.push(`Because you selected "${flag}", this ingredient matches a higher-risk tag.`);
        } else if (hitCaution) {
          finalRisk = riskMax(finalRisk, "caution");
          reasons.push(`Because you selected "${flag}", this ingredient matches a caution tag.`);
        }
      }

      // ingredient overrides (like MI always high)
      if (rules.ingredient_id_overrides?.[match.id]?.always_at_least) {
        finalRisk = riskMax(finalRisk, rules.ingredient_id_overrides[match.id].always_at_least);
        reasons.push(rules.ingredient_id_overrides[match.id].reason);
      }

      // add your ingredient notes
      if (Array.isArray(match.risk_notes)) {
        reasons.push(...match.risk_notes);
      }

      return {
        input: rawName,
        status: "matched",
        inci: match.inci,
        base_risk: match.base_risk,
        final_risk: finalRisk,
        tags: match.tags,
        cir_sources: match.cir_sources,
        reasons
      };
    });

    // overall risk = highest final_risk among matched
    const overallRisk = results.reduce((acc, r) => {
      if (!r.final_risk || r.final_risk === "unknown") return acc;
      if (!rules.risk_rank[r.final_risk]) return acc;
      return riskMax(acc, r.final_risk);
    }, "low");

    res.send({ overall_risk: overallRisk, results });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});