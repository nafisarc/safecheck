require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "safecheck_super_secret_key_change_me";

app.use(cors());
app.use(express.json());

const ingredientsKb = require("./kb/data/ingredients.json");
const productsKbRaw = require("./kb/data/products.json");
const rules = require("./kb/data/rules.json");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const productsList = Array.isArray(productsKbRaw)
  ? productsKbRaw
  : productsKbRaw.products || [];

let db;

const COLORS_UNUSED_BUT_OK = null;

function normalize(str = "") {
  return String(str).toLowerCase().trim().replace(/\s+/g, " ");
}

function uniq(arr = []) {
  return [...new Set(arr.filter(Boolean))];
}

function humanizeFlag(flag = "") {
  return String(flag)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function riskMax(a, b) {
  const rank = rules.risk_rank || { low: 1, caution: 2, high: 3, unknown: 0 };
  return (rank[b] || 0) > (rank[a] || 0) ? b : a;
}

function normalizeRisk(value) {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "high";
  if (v === "caution" || v === "medium") return "caution";
  if (v === "low") return "low";
  return "unknown";
}

const ingredientIndex = new Map();

for (const ing of ingredientsKb) {
  if (!ing?.inci) continue;

  ingredientIndex.set(normalize(ing.inci), ing);

  if (Array.isArray(ing.synonyms)) {
    for (const syn of ing.synonyms) {
      ingredientIndex.set(normalize(syn), ing);
    }
  }
}

function getFlagsFromProfile(profileObj = {}) {
  const flags = [];

  if (!profileObj || typeof profileObj !== "object") return flags;

  const skinConditions = profileObj.skinConditions || {};
  const allergies = profileObj.allergies || {};
  const skinSensitivity = normalize(profileObj.skinSensitivity || "");

  if (skinConditions.eczema) flags.push("eczema");
  if (skinConditions.rosacea) flags.push("rosacea");
  if (skinConditions.psoriasis) flags.push("psoriasis");
  if (skinConditions.asthma) flags.push("asthma");

  if (allergies.sulfates) flags.push("sulfates");
  if (allergies.parabens) flags.push("parabens");
  if (allergies.fragrance) flags.push("fragrance");
  if (allergies.nuts) flags.push("nuts");
  if (allergies.dairy) flags.push("dairy");

  if (skinSensitivity === "sensitive" || skinSensitivity === "very sensitive") {
    flags.push("sensitive");
  }

  if (skinSensitivity === "very sensitive") {
    flags.push("very_sensitive");
  }

  return uniq(flags);
}

function getActiveFlags(profileFlags, profileObj, storedProfile) {
  const fromExplicit = Array.isArray(profileFlags) ? profileFlags : [];
  const fromBodyProfile = profileObj && typeof profileObj === "object" ? getFlagsFromProfile(profileObj) : [];
  const fromStoredProfile = storedProfile && typeof storedProfile === "object" ? getFlagsFromProfile(storedProfile) : [];

  return uniq([...fromExplicit, ...fromBodyProfile, ...fromStoredProfile]);
}

function buildAvoidList(profileObj, storedProfile) {
  const fromBody = safeArray(profileObj?.avoidList).map(normalize);
  const fromStored = safeArray(storedProfile?.avoidList).map(normalize);
  return uniq([...fromBody, ...fromStored]);
}

function getProfileSummary(storedProfile) {
  if (!storedProfile) return null;

  return {
    skinSensitivity: storedProfile.skinSensitivity || "",
    skinConditions: storedProfile.skinConditions || {},
    allergies: storedProfile.allergies || {},
    avoidList: safeArray(storedProfile.avoidList),
  };
}

function buildGenericReasonForTag(flag, tag) {
  return `Because your profile includes ${humanizeFlag(flag)}, this ingredient matches ${humanizeFlag(tag)}.`;
}

function getMatchedReasonTemplates(flag, matchedTags = []) {
  const profileRule = rules.profile_rules?.[flag];
  const templates = profileRule?.reason_templates || {};
  const out = [];

  for (const tag of matchedTags) {
    if (templates[tag]) {
      out.push(templates[tag]);
    } else {
      out.push(buildGenericReasonForTag(flag, tag));
    }
  }

  return uniq(out);
}

function analyzeIngredient(match, rawName, activeFlags, avoidList) {
  if (!match) {
    return {
      input: rawName,
      status: "unknown",
      final_risk: "unknown",
      reasons: ["Not found in knowledge base yet."],
      personal_reasons: [],
      matched_profile_flags: [],
      matched_tags: [],
      avoid_list_match: false,
    };
  }

  let finalRisk = normalizeRisk(match.base_risk || "caution");
  const reasons = [];
  const personalReasons = [];
  const matchedProfileFlags = [];
  const matchedTags = [];
  const tags = safeArray(match.tags);

  const normalizedRaw = normalize(rawName);
  const normalizedInci = normalize(match.inci);
  const normalizedSynonyms = safeArray(match.synonyms).map(normalize);

  const avoidListMatch =
    avoidList.includes(normalizedRaw) ||
    avoidList.includes(normalizedInci) ||
    normalizedSynonyms.some((syn) => avoidList.includes(syn));

  for (const flag of activeFlags) {
    const rule = rules.profile_rules?.[flag];
    if (!rule) continue;

    const hitHighTags = safeArray(rule.to_high_if_tags).filter((t) => tags.includes(t));
    const hitCautionTags = safeArray(rule.to_caution_if_tags).filter((t) => tags.includes(t));

    if (hitHighTags.length > 0) {
      finalRisk = riskMax(finalRisk, "high");
      matchedProfileFlags.push(flag);
      matchedTags.push(...hitHighTags);
      personalReasons.push(...getMatchedReasonTemplates(flag, hitHighTags));
    }

    if (hitCautionTags.length > 0) {
      finalRisk = riskMax(finalRisk, "caution");
      matchedProfileFlags.push(flag);
      matchedTags.push(...hitCautionTags);
      personalReasons.push(...getMatchedReasonTemplates(flag, hitCautionTags));
    }
  }

  if (avoidListMatch) {
    finalRisk = riskMax(finalRisk, "high");
    reasons.push("This ingredient matches something in your personal Avoid List.");
    personalReasons.push("This ingredient matches your personal Avoid List, so SafeCheck marked it as higher concern for you.");
    matchedProfileFlags.push("avoid_list");
    matchedTags.push("avoid_list_match");
  }

  if (rules.ingredient_id_overrides?.[match.id]?.always_at_least) {
    finalRisk = riskMax(finalRisk, rules.ingredient_id_overrides[match.id].always_at_least);

    if (rules.ingredient_id_overrides[match.id].reason) {
      reasons.push(rules.ingredient_id_overrides[match.id].reason);
    }
  }

  if (Array.isArray(match.risk_notes)) {
    reasons.push(...match.risk_notes);
  }

  return {
    input: rawName,
    status: "matched",
    inci: match.inci,
    base_risk: normalizeRisk(match.base_risk),
    final_risk: finalRisk,
    tags,
    cir_sources: safeArray(match.cir_sources),
    reasons: uniq(reasons),
    personal_reasons: uniq(personalReasons),
    matched_profile_flags: uniq(matchedProfileFlags),
    matched_tags: uniq(matchedTags),
    avoid_list_match: avoidListMatch,
  };
}

function computeOverallRisk(results = []) {
  return results.reduce((acc, r) => {
    const risk = normalizeRisk(r.final_risk);
    if (risk === "unknown") return acc;
    return riskMax(acc, risk);
  }, "low");
}

function buildPersonalizedWatchouts(results = [], activeFlags = [], profileSummary = null) {
  const flagged = results.filter((r) => ["high", "caution"].includes(normalizeRisk(r.final_risk)));
  const allTags = uniq(flagged.flatMap((r) => safeArray(r.tags)));
  const allMatchedFlags = uniq(flagged.flatMap((r) => safeArray(r.matched_profile_flags)));
  const lines = [];

  const hasFlag = (flag) => activeFlags.includes(flag) || allMatchedFlags.includes(flag);
  const hasTag = (tag) => allTags.includes(tag);

  if (flagged.length === 0) {
    lines.push("No higher-concern ingredients were found based on your current profile and the demo database.");
    return lines;
  }

  if (hasFlag("eczema") && (hasTag("eczema_trigger") || hasTag("sensitizer_flag") || hasTag("drying") || hasTag("surfactant"))) {
    lines.push("Because you have eczema, some ingredients in this product may irritate your skin barrier or increase dryness.");
  }

  if (hasFlag("sensitive") && (hasTag("sensitive_skin_trigger") || hasTag("potential_sting") || hasTag("active") || hasTag("exfoliant") || hasTag("fragrance"))) {
    lines.push("Because you have sensitive skin, this formula may sting, irritate, or feel too harsh for you.");
  }

  if (hasFlag("fragrance") && hasTag("fragrance")) {
    lines.push("Because you marked fragrance sensitivity, fragranced ingredients in this product may not be a good fit for you.");
  }

  if (hasFlag("rosacea") && (hasTag("rosacea_trigger") || hasTag("fragrance") || hasTag("active") || hasTag("exfoliant"))) {
    lines.push("Because you have rosacea, strong actives or fragranced ingredients may trigger redness or discomfort.");
  }

  if (hasFlag("psoriasis") && (hasTag("psoriasis_trigger") || hasTag("sensitizer_flag") || hasTag("drying"))) {
    lines.push("Because you have psoriasis, irritating or drying ingredients may worsen discomfort for you.");
  }

  if (hasTag("surfactant") && (hasFlag("eczema") || hasFlag("sensitive"))) {
    lines.push("Some cleansing agents in this formula may feel drying for your skin, so moisturize after use if needed.");
  }

  if (hasTag("active") || hasTag("aha") || hasTag("bha") || hasTag("exfoliant")) {
    lines.push("Start slowly and patch test first, especially if you already know your skin reacts easily.");
  }

  if (flagged.some((r) => r.avoid_list_match)) {
    lines.push("At least one ingredient matches your personal Avoid List, so this product deserves extra caution for you.");
  }

  if (
    hasFlag("eczema") &&
    hasFlag("sensitive") &&
    hasFlag("fragrance") &&
    hasTag("fragrance")
  ) {
    lines.push("Since you have eczema and sensitive skin, and you also marked fragrance sensitivity, fragranced ingredients may be especially irritating for you.");
  }

  if (profileSummary?.skinSensitivity === "Very Sensitive") {
    lines.push("Your profile shows very sensitive skin, so even medium-risk ingredients may feel stronger on your skin than on other users.");
  }

  return uniq(lines).slice(0, 6);
}

async function getStoredProfileByEmail(email) {
  if (!db || !email) return null;
  return db.collection("profiles").findOne({ email });
}

async function buildAnalysisContext({ req, profileFlags, profile }) {
  const storedProfile = req?.user?.email ? await getStoredProfileByEmail(req.user.email) : null;
  const activeFlags = getActiveFlags(profileFlags, profile, storedProfile);
  const avoidList = buildAvoidList(profile, storedProfile);
  const profileSummary = getProfileSummary(storedProfile || profile);

  return {
    storedProfile,
    activeFlags,
    avoidList,
    profileSummary,
  };
}

async function analyzeIngredientsList({ ingredients, req, profileFlags, profile }) {
  const { activeFlags, avoidList, profileSummary } = await buildAnalysisContext({
    req,
    profileFlags,
    profile,
  });

  const results = safeArray(ingredients).map((rawName) => {
    const key = normalize(rawName);
    const match = ingredientIndex.get(key);
    return analyzeIngredient(match, rawName, activeFlags, avoidList);
  });

  const overallRisk = computeOverallRisk(results);
  const flagged = results.filter((r) => ["high", "caution"].includes(normalizeRisk(r.final_risk)));
  const personalizedWatchouts = buildPersonalizedWatchouts(results, activeFlags, profileSummary);

  return {
    activeFlags,
    avoidList,
    profileSummary,
    overallRisk,
    results,
    flagged,
    personalizedWatchouts,
  };
}

function optionalAuthMiddleware(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
  } catch (_e) {
    req.user = null;
  }

  next();
}

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
  } catch (_e) {
    return res.status(401).send({ error: "Invalid or expired token" });
  }
}

async function start() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ MongoDB connected");

    db = client.db("safecheck");

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

app.get("/", (_req, res) => {
  res.send("SafeCheck Backend is Running 🚀");
});

/* -----------------------------
   AUTH ROUTES
----------------------------- */

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const normalizedName = String(fullName || "").trim().replace(/\s+/g, " ");
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).send({
        error: "Full name, email, and password are required.",
      });
    }

    if (!/^[A-Za-z ]+$/.test(normalizedName) || normalizedName.length < 2) {
      return res.status(400).send({
        error: "Full name must contain letters and spaces only.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).send({
        error: "Please enter a valid email address.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).send({
        error: "Password must be at least 6 characters.",
      });
    }

    const users = db.collection("users");
    const existingUser = await users.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).send({
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      fullName: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email: normalizedEmail,
        fullName: normalizedName,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.send({
      message: "Account created successfully",
      token,
      user: {
        id: result.insertedId.toString(),
        fullName: normalizedName,
        email: normalizedEmail,
      },
    });
  } catch (e) {
    return res.status(500).send({ error: e.message || "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!normalizedEmail || !password) {
      return res.status(400).send({ error: "Email and password are required." });
    }

    const users = db.collection("users");
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
    return res.status(500).send({ error: e.message || "Could not log in." });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).send({ error: "User not found." });
    }

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

/* -----------------------------
   PROFILE ROUTES
----------------------------- */

app.post("/api/profile", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { age, gender, skinConditions, allergies, skinSensitivity, avoidList } = req.body;

    const profileData = {
      email,
      age: age || "",
      gender: gender || "",
      skinSensitivity: skinSensitivity || "",
      avoidList: Array.isArray(avoidList) ? uniq(avoidList.map((x) => String(x).trim()).filter(Boolean)) : [],
      skinConditions: {
        eczema: !!skinConditions?.eczema,
        rosacea: !!skinConditions?.rosacea,
        psoriasis: !!skinConditions?.psoriasis,
        asthma: !!skinConditions?.asthma,
      },
      allergies: {
        sulfates: !!allergies?.sulfates,
        parabens: !!allergies?.parabens,
        fragrance: !!allergies?.fragrance,
        nuts: !!allergies?.nuts,
        dairy: !!allergies?.dairy,
      },
      updatedAt: new Date(),
    };

    await db.collection("profiles").findOneAndUpdate(
      { email },
      { $set: profileData },
      { upsert: true }
    );

    const saved = await db.collection("profiles").findOne({ email });
    res.send(saved);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.get("/api/profile/me", authMiddleware, async (req, res) => {
  try {
    const data = await db.collection("profiles").findOne({ email: req.user.email });

    res.send({
      age: "",
      gender: "",
      skinSensitivity: "",
      avoidList: [],
      skinConditions: {
        eczema: false,
        rosacea: false,
        psoriasis: false,
        asthma: false,
      },
      allergies: {
        sulfates: false,
        parabens: false,
        fragrance: false,
        nuts: false,
        dairy: false,
      },
      ...data,
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* -----------------------------
   PRODUCT ROUTES
----------------------------- */

app.get("/api/products/search", (_req, res, next) => next(), (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();

  if (!q) {
    return res.send({ results: [] });
  }

  const results = productsList
    .filter((p) => {
      const hay = `${p.brand} ${p.name}`.toLowerCase();
      return hay.includes(q) || String(p.name || "").toLowerCase().includes(q) || String(p.brand || "").toLowerCase().includes(q);
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

app.get("/api/products/random", (_req, res) => {
  try {
    if (!productsList.length) {
      return res.status(404).send({ error: "No products found" });
    }

    const product = productsList[Math.floor(Math.random() * productsList.length)];

    res.send({
      product: {
        id: product.id,
        brand: product.brand,
        name: product.name,
        category: product.category || "",
        ingredientsCount: Array.isArray(product.ingredients_inci || product.ingredients)
          ? (product.ingredients_inci || product.ingredients).length
          : 0,
      },
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.get("/api/products/:id/check", optionalAuthMiddleware, async (req, res) => {
  try {
    const pid = decodeURIComponent(req.params.id).toLowerCase();
    const product = productsList.find((p) => String(p.id).toLowerCase() === pid);

    if (!product) {
      return res.status(404).send({ error: "Product not found" });
    }

    const flagsCsv = String(req.query.flags || "");
    const explicitFlags = flagsCsv
      ? flagsCsv.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const ingredients = product.ingredients_inci || product.ingredients || [];

    const analysis = await analyzeIngredientsList({
      ingredients,
      req,
      profileFlags: explicitFlags,
      profile: null,
    });

    return res.send({
      mode: "product",
      product: {
        id: product.id,
        brand: product.brand,
        name: product.name,
      },
      overall_risk: analysis.overallRisk,
      active_flags: analysis.activeFlags,
      profile_summary: analysis.profileSummary,
      personalized_watchouts: analysis.personalizedWatchouts,
      results: analysis.results,
      flagged: analysis.flagged,
    });
  } catch (e) {
    res.status(500).send({ error: e.message || "Could not analyze product." });
  }
});

/* -----------------------------
   INGREDIENT CHECK
----------------------------- */

app.post("/api/check", optionalAuthMiddleware, async (req, res) => {
  try {
    const { ingredients = [], profileFlags, profile } = req.body;

    const analysis = await analyzeIngredientsList({
      ingredients,
      req,
      profileFlags,
      profile,
    });

    res.send({
      overall_risk: analysis.overallRisk,
      active_flags: analysis.activeFlags,
      profile_summary: analysis.profileSummary,
      personalized_watchouts: analysis.personalizedWatchouts,
      results: analysis.results,
      flagged: analysis.flagged,
    });
  } catch (e) {
    res.status(500).send({ error: e.message || "Could not analyze ingredients." });
  }
});

/* -----------------------------
   HISTORY ROUTES
----------------------------- */

app.post("/api/history", authMiddleware, async (req, res) => {
  try {
    const {
      mode,
      productTitle,
      inputIngredients,
      overall_risk,
      results,
      personalized_watchouts,
      profile_summary,
    } = req.body;

    const historyEntry = {
      userId: req.user.userId,
      email: req.user.email,
      mode: mode || "ingredients",
      productTitle: productTitle || null,
      inputIngredients: safeArray(inputIngredients),
      overall_risk: overall_risk || "unknown",
      flaggedCount: safeArray(results).filter(
        (r) => ["high", "caution"].includes(normalizeRisk(r.final_risk))
      ).length,
      personalized_watchouts: safeArray(personalized_watchouts),
      profile_summary: profile_summary || null,
      results: safeArray(results),
      createdAt: new Date(),
    };

    const inserted = await db.collection("history").insertOne(historyEntry);
    res.send({ message: "Saved to history", id: inserted.insertedId });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.get("/api/history", authMiddleware, async (req, res) => {
  try {
    const entries = await db
      .collection("history")
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.send({ history: entries });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.delete("/api/history/:id", authMiddleware, async (req, res) => {
  try {
    await db.collection("history").deleteOne({
      _id: new ObjectId(req.params.id),
      userId: req.user.userId,
    });

    res.send({ message: "Deleted" });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* -----------------------------
   AI EXPLAINER
----------------------------- */

app.post("/api/explain", authMiddleware, async (req, res) => {
  try {
    const { question, ingredients, profileFlags, previousMessages } = req.body;

    if (!question) {
      return res.status(400).send({ error: "Question is required." });
    }

    const storedProfile = await getStoredProfileByEmail(req.user.email);
    const activeFlags = getActiveFlags(profileFlags, null, storedProfile);

    const ingredientSummary = safeArray(ingredients)
      .map((i) => {
        const risk = i.final_risk || i.risk || "unknown";
        const tags = Array.isArray(i.tags) ? i.tags.join(", ") : "none";
        const personalReasons = Array.isArray(i.personal_reasons) && i.personal_reasons.length
          ? ` personal_reasons=${i.personal_reasons.join(" | ")}`
          : "";
        return `- ${i.inci || i.input}: risk=${risk}, tags=${tags}${personalReasons}`;
      })
      .join("\n");

    const profileSummary =
      activeFlags.length > 0
        ? `User profile flags: ${activeFlags.join(", ")}`
        : "No specific profile flags set.";

    const systemPrompt = `You are SafeCheck's AI assistant. You help users understand cosmetic ingredient safety in simple, friendly language.

You have access to the following scan results:
${ingredientSummary}

${profileSummary}

Rules:
- Keep answers short, clear, and friendly
- Never give medical diagnoses or replace professional advice
- Use the user's profile when explaining why something may be more risky for them
- If an ingredient has personal reasons, prioritize those in your answer
- Suggest patch testing when the user seems worried
- Do not sound alarmist
- If asked for alternatives, suggest fragrance-free, gentler, or lower-active options when relevant`;

    const history = safeArray(previousMessages).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(question);
    const reply = result.response.text();

    res.send({ reply });
  } catch (e) {
    console.error("Gemini error:", e?.message);
    res.status(500).send({ error: e.message || "Could not generate explanation." });
  }
});