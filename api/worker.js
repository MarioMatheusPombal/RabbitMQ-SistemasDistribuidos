// worker.js
require("dotenv").config();
const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
const QUEUE_NAME = "jobs";

(async () => {
  const conn = await amqp.connect(RABBIT_URL);
  const channel = await conn.createChannel();

  // Limita a 1 job por worker por vez (back-pressure)
  channel.prefetch(1);
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log("👷‍♂️  Worker pronto. Aguardando mensagens…");

  channel.consume(QUEUE_NAME, async msg => {
    if (!msg) return;
    const job = JSON.parse(msg.content.toString());
    const { jobId, payload } = job;

    try {
      console.log(`➡️  Recebido job ${jobId}`, payload);

      // ========= SUA LÓGICA DE NEGÓCIO AQUI =========
      // Exemplo fictício: processar dados demorados
      const result = await heavyComputation(payload);
      // ==============================================

      console.log(`✅ Job ${jobId} finalizado`, result);

      // (para o tópico 4) — publicar resultado em outra fila
      await notifyUI(channel, jobId, result);

      channel.ack(msg);               // marca como concluído
    } catch (err) {
      console.error(`❌ Erro no job ${jobId}:`, err);
      channel.nack(msg, false, false); // descarta ou reencaminha (false,false = dead-letter)
    }
  });
})().catch(err => console.error(err));

// ---------- Funções auxiliares ----------
function heavyComputation(data) {
  return new Promise(resolve => {
    // simula I/O ou CPU bound
    setTimeout(() => resolve({ processed: true, echo: data }), 2000);
  });
}

async function notifyUI(ch, jobId, result) {
  // Publica em uma fila de eventos; será consumida pelo serviço de WebSocket
  const EVENT_QUEUE = "job_events";
  await ch.assertQueue(EVENT_QUEUE, { durable: true });
  ch.sendToQueue(
    EVENT_QUEUE,
    Buffer.from(JSON.stringify({ type: "job_done", jobId, result })),
    { persistent: false }
  );
}
