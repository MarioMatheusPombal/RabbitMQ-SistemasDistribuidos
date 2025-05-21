// src/rabbit.js
const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
const QUEUE_NAME = "jobs";

let channel;   // reaproveitado entre requisições

async function connect() {
  if (channel) return channel;
  const conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return channel;
}

async function publishJob(job) {
  const ch = await connect();
  const success = ch.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(job)),
    { persistent: true }           // garante gravação em disco
  );
  if (!success) throw new Error("Falha ao enfileirar mensagem");
}

module.exports = { publishJob };
