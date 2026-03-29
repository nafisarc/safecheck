require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

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

// --- Ingredient Safety Check ---
const knowledge = [
  { name: "Methylparaben", risk: "Medium", concern: "Can irritate sensitive skin" },
  { name: "Sodium Lauryl Sulfate", risk: "High", concern: "Common irritant for eczema" },
  { name: "Fragrance", risk: "Medium", concern: "May contain allergens" },
];

app.post("/api/check", async (req, res) => {
  try {
    const { ingredients = [], profile = {} } = req.body;
    const results = ingredients.map((name) => {
      const match = knowledge.find(
        (k) => k.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (!match) return { name, risk: "Unknown", concern: "Not found in database" };
      const personalized =
        profile?.avoidList?.includes(match.name) ||
        profile?.allergies?.includes(match.name)
          ? "High"
          : match.risk;
      return { ...match, personalized };
    });
    res.send({ results });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});
