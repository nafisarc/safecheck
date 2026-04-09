require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "safecheck_super_secret_key_change_me";

app.use(cors());
app.use(express.json());

// ------------------------------
// Existing KB loading
// ------------------------------
const ingredientsKb = require("./kb/data/ingredients.json");
const productsKbRaw = require("./kb/data/products.json");
const rules = require("./kb/data/rules.json");

const productsList = Array.isArray(productsKbRaw)
  ? productsKbRaw
  : (productsKbRaw.products || []);

function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const ingredientIndex = new Map();

for (const ing of ingredientsKb) {
  ingredientIndex.set(normalize(ing.inci), ing);

  if (Array.isArray(ing.synonyms)) {
    for (const syn of ing.synonyms) {
      ingredientIndex.set(normalize(syn), ing);
    }
  }
}

function riskMax(a, b) {
  const rank = rules.risk_rank;
  return rank[b] > rank[a] ? b : a;
}

function getActiveFlags(profileFlags, profileObj) {
  if (Array.isArray(profileFlags)) return profileFlags;

  if (profileObj && typeof profileObj === "object") {
    return Object.keys(rules.profile_rules).filter((k) => profileObj[k] === true);
  }

  return [];
}

let db;

// ------------------------------
// Auth middleware
// ------------------------------
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).send({ error: "Invalid or expired token" });
  }
}

// ------------------------------
// Connect MongoDB
// ------------------------------
async function start() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ MongoDB connected");

    db = client.db("safecheck");

    // create unique index on users email
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("profiles").createIndex({ email: 1 }, { unique: true });

    app.listen(PORT, () => {
      console.log(`🚀 API running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Mongo connection failed:", err);
  }
}
start();

// ------------------------------
// Basic route
// ------------------------------
app.get("/", (req, res) => {
  res.send("SafeCheck Backend is Running 🚀");
});

// ------------------------------
// AUTH ROUTES
// ------------------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).send({ error: "Full name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).send({ error: "Password must be at least 6 characters." });
    }

    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).send({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email: normalizedEmail,
        fullName: fullName.trim(),
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.send({
      message: "Account created successfully",
      token,
      user: {
        id: result.insertedId.toString(),
        fullName: fullName.trim(),
        email: normalizedEmail,
      },
    });
  } catch (e) {
    return res.status(500).send({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ error: "Email and password are required." });
    }

    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).send({ error: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.send({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (e) {
    return res.status(500).send({ error: e.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const users = db.collection("users");
    const user = await users.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(404).send({ error: "User not found" });

    res.send(user);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.delete("/api/auth/delete-account", authMiddleware, async (req, res) => {
  try {
    await db.collection("users").deleteOne({ _id: new ObjectId(req.user.userId) });
    await db.collection("profiles").deleteOne({ email: req.user.email });

    res.send({ message: "Account deleted successfully" });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ------------------------------
// PROFILE ROUTES
// ------------------------------
app.post("/api/profile", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const rest = req.body;

    const profiles = db.collection("profiles");
    await profiles.findOneAndUpdate(
      { email },
      { $set: { email, ...rest, updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );

    const saved = await profiles.findOne({ email });
    res.send(saved);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.get("/api/profile/me", authMiddleware, async (req, res) => {
  try {
    const data = await db.collection("profiles").findOne({ email: req.user.email });
    res.send(data || {});
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ------------------------------
// PRODUCT SEARCH
// ------------------------------
app.get("/api/products/search", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase().trim();
  if (!q) return res.send({ results: [] });

  const results = productsList
    .filter((p) => {
      const hay = `${p.brand} ${p.name}`.toLowerCase();
      return hay.includes(q) || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    })
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      brand: p.brand,
      name: p.name,
      category: p.category || "",
    }));

  res.send({ results });
});

// ------------------------------
// PRODUCT CHECK
// ------------------------------
app.get("/api/products/:id/check", (req, res) => {
  const pid = decodeURIComponent(req.params.id).toLowerCase();
  const product = productsList.find((p) => String(p.id).toLowerCase() === pid);

  if (!product) return res.status(404).send({ error: "Product not found" });

  const flagsCsv = (req.query.flags || "").toString();
  const profileFlags = flagsCsv
    ? flagsCsv.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const activeFlags = getActiveFlags(profileFlags, null);
  const ingredients = product.ingredients_inci || product.ingredients || [];

  const results = ingredients.map((rawName) => {
    const key = normalize(rawName);
    const match = ingredientIndex.get(key);

    if (!match) {
      return {
        input: rawName,
        status: "unknown",
        final_risk: "unknown",
        reasons: ["Not found in knowledge base yet."],
      };
    }

    let finalRisk = match.base_risk || "caution";
    const reasons = [];

    for (const flag of activeFlags) {
      const rule = rules.profile_rules[flag];
      if (!rule) continue;

      const tags = match.tags || [];
      const hitHigh = (rule.to_high_if_tags || []).some((t) => tags.includes(t));
      const hitCaution = (rule.to_caution_if_tags || []).some((t) => tags.includes(t));

      if (hitHigh) {
        finalRisk = riskMax(finalRisk, "high");
      } else if (hitCaution) {
        finalRisk = riskMax(finalRisk, "caution");
      }
    }

    if (rules.ingredient_id_overrides?.[match.id]?.always_at_least) {
      finalRisk = riskMax(finalRisk, rules.ingredient_id_overrides[match.id].always_at_least);
    }

    if (Array.isArray(match.risk_notes)) reasons.push(...match.risk_notes);

    return {
      input: rawName,
      status: "matched",
      inci: match.inci,
      base_risk: match.base_risk,
      final_risk: finalRisk,
      tags: match.tags,
      cir_sources: match.cir_sources,
      reasons,
    };
  });

  const overallRisk = results.reduce((acc, r) => {
    if (!r.final_risk || r.final_risk === "unknown") return acc;
    if (!rules.risk_rank[r.final_risk]) return acc;
    return riskMax(acc, r.final_risk);
  }, "low");

  const flagged = results.filter((r) => r.final_risk === "high" || r.final_risk === "caution");

  res.send({
    mode: "product",
    product: { id: product.id, brand: product.brand, name: product.name },
    overall_risk: overallRisk,
    results,
    flagged,
  });
});

// ------------------------------
// MANUAL INGREDIENT CHECK
// ------------------------------
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
          reasons: ["Not found in knowledge base yet."],
        };
      }

      let finalRisk = match.base_risk || "caution";
      const reasons = [];

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

      if (rules.ingredient_id_overrides?.[match.id]?.always_at_least) {
        finalRisk = riskMax(finalRisk, rules.ingredient_id_overrides[match.id].always_at_least);
        reasons.push(rules.ingredient_id_overrides[match.id].reason);
      }

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
        reasons,
      };
    });

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