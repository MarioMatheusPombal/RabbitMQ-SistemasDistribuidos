// src/server.js
require("dotenv").config();
const express = require("express");
const { v4: uuid } = require("uuid");
const { publishJob } = require("./rabbit");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/jobs", async (req, res) => {
  try {
    const jobId = uuid();
    const payload = req.body;

    // pacote enviado ao consumidor
    const jobMsg = { jobId, payload, createdAt: Date.now() };

    await publishJob(jobMsg);
    console.log(`Job ${jobId} publicado 📨`);

    res.status(202).json({ jobId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao publicar trabalho" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escutando em http://localhost:${PORT}`));
