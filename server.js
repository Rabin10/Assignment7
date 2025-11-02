// server.js
"use strict";

const express = require("express");
const app = express();

const multer = require("multer");
app.use(multer().none());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

require("dotenv").config();

const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// ---- health check like you did in class (optional) ----
async function testDb() {
  try {
    const result = await pool.query("SELECT 1 as ok");
    console.log("DB OK:", result.rows[0]);
  } catch (e) {
    console.error("DB connection failed:", e.message);
  }
}
testDb();

// ===================== JOKEBOOK ENDPOINTS =====================
// GET /jokebook/categories
app.get("/jokebook/categories", async function (req, res) {
  try {
    const queryText = "SELECT DISTINCT category FROM jokes ORDER BY category";
    const result = await pool.query(queryText);
    res.json({ categories: result.rows.map(r => r.category) });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error getting categories");
  }
});

// GET /jokebook/category/:category?limit=n
app.get("/jokebook/category/:category", async function (req, res) {
  let category = req.params.category;
  let limit = req.query.limit;

  if (!category) {
    res.status(400).send("Missing required category param!");
    return;
  }

  try {
    let values = [category];
    let queryText = "SELECT id, category, setup, delivery FROM jokes WHERE category = $1";

    if (limit && Number(limit) > 0) {
      values.push(Number(limit));
      queryText += " LIMIT $" + values.length;
    }

    const result = await pool.query(queryText, values);

    if (result.rows.length === 0) {
      // Assignment asks for an appropriate error if category not valid
      res.status(404).json({ error: `No jokes found for category '${category}'` });
      return;
    }

    res.json({
      category: category,
      count: result.rows.length,
      jokes: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error getting jokes by category");
  }
});

// GET /jokebook/random
app.get("/jokebook/random", async function (req, res) {
  try {
    const queryText = "SELECT id, category, setup, delivery FROM jokes ORDER BY RANDOM() LIMIT 1";
    const result = await pool.query(queryText);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "No jokes in database yet" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error getting random joke");
  }
});

// POST /jokebook/joke/add  (assignment route)
// Alias /jokebook/add (some rubrics/screens use this form)
app.post("/jokebook/joke/add", async function (req, res) {
  const { category, setup, delivery } = req.body || {};  // <— guard

  if (!category || !setup || !delivery) {
    return res.status(400).json({ error: "Missing required fields: category, setup, delivery" });
  }

  try {
    const insertText = `
      INSERT INTO jokes (category, setup, delivery)
      VALUES ($1, $2, $3)
      RETURNING id, category, setup, delivery
    `;
    const added = await pool.query(insertText, [category, setup, delivery]);

    const list = await pool.query(
      `SELECT id, category, setup, delivery
       FROM jokes
       WHERE category = $1
       ORDER BY id DESC`, [category]
    );

    return res.status(201).json({ added: added.rows[0], list: list.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error adding joke");
  }
});


// optional alias
app.post("/jokebook/joke/add", async function (req, res) {
  // Guard so bad/missing bodies don’t crash your server
  const { category, setup, delivery } = req.body || {};

  // If missing any required param → 400 + clear message
  if (!category || !setup || !delivery) {
    return res.status(400).json({
      error: "Missing required fields: category, setup, delivery"
    });
  }

  try {
    // Insert the new joke (parameterized to avoid injection)
    const insertText = `
      INSERT INTO jokes (category, setup, delivery)
      VALUES ($1, $2, $3)
      RETURNING id, category, setup, delivery
    `;
    const added = await pool.query(insertText, [category, setup, delivery]);

    // Return updated jokebook for that category
    const listText = `
      SELECT id, category, setup, delivery
      FROM jokes
      WHERE category = $1
      ORDER BY id DESC
    `;
    const list = await pool.query(listText, [category]);

    return res.status(201).json({
      added: added.rows[0],
      list: list.rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error adding joke");
  }
});

// ===================== SERVER START =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log("Server listening on port: " + PORT + "!");
});
