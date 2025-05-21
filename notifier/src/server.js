// src/server.js
require("dotenv").config();
const http   = require("http");
const express = require("express");
const { Server } = require("socket.io");
const amqp   = require("amqplib");

const RABBIT_URL  = process.env.RABBIT_URL  || "amqp://localhost";
const EVENT_QUEUE = process.env.EVENT_QUEUE || "job_events";
const PORT        = process.env.PORT        || 3001;

(async () => {
  /* ---------- WebSocket (Socket.IO) ---------- */
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }            // ajuste p/ produção
  });

  io.on("connection", socket => {
    console.log("🔌 Cliente conectado", socket.id);

    /* opcional: permitir que o cliente entre
       num "room" específica pro job */
    socket.on("subscribe_job", jobId => {
      socket.join(jobId);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Cliente desconectado", socket.id);
    });
  });

  server.listen(PORT, () =>
    console.log(`WebSocket pronto em ws://localhost:${PORT}`)
  );

  /* ---------- RabbitMQ consumer ---------- */
  const conn = await amqp.connect(RABBIT_URL);
  const ch   = await conn.createChannel();
  await ch.assertQueue(EVENT_QUEUE, { durable: true });
  console.log("📡 Aguardando mensagens na fila job_events…");

  ch.consume(EVENT_QUEUE, msg => {
    if (!msg) return;
    const evt = JSON.parse(msg.content.toString());

    /* Estrutura vinda do worker:
       { type:"job_done", jobId, result } */

    if (evt.type === "job_done") {
      console.log(`🔔 Job ${evt.jobId} concluído — notificando clientes`);
      /* envia:
         • para todos:  io.emit(...)
         • para quem assinou apenas o job: io.to(evt.jobId).emit(...) */
      io.emit("job_done", evt);
    }

    ch.ack(msg);           // tira da fila só depois de emitir
  });
})();
