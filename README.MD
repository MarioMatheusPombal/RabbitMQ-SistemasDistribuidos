# Sistema Distribuído com RabbitMQ, Node.js e Socket.IO

Arquitetura de referência ― **Interface Web + API + Worker + Notificador**

> Repositório-exemplo que demonstra um fluxo completo de mensagens assíncronas com **RabbitMQ** e notificações em tempo-real via **Socket.IO**.

![Diagrama de Sequência](./docs/sequence-diagram.png) <!-- opcional, adicione se criar a imagem -->

---

## Sumário

1. [Descrição Geral](#descrição-geral)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Pré-requisitos](#pré-requisitos)
4. [Configuração](#configuração)
5. [Execução Manual (vários terminais)](#execução-manual-vários-terminais)
6. [Execução com Docker Compose (atalho)](#execução-com-docker-compose-atalho)
7. [Fluxo de Teste](#fluxo-de-teste)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)
9. [Possíveis Erros & Soluções](#possíveis-erros--soluções)

---

## Descrição Geral

| Componente                              | Porta            | Responsabilidade                                                  | Principais pacotes                   |
| --------------------------------------- | ---------------- | ----------------------------------------------------------------- | ------------------------------------ |
| **Interface** (`index.html`)            | –                | Envia *jobs* pela API e escuta notificações via Socket.IO         | `socket.io-client`                   |
| **API** (`api/src/server.js`)           | `3000`           | Recebe HTTP `POST /jobs`, gera `jobId` e publica na fila `jobs`   | `express`, `amqplib`, `cors`, `uuid` |
| **Worker** (`api/worker.js`)            | –                | Consome `jobs`, executa a tarefa e publica evento em `job_events` | `amqplib`                            |
| **Notifier** (`notifier/src/server.js`) | `3001`           | Consome `job_events` e empurra para os navegadores via Socket.IO  | `express`, `socket.io`, `amqplib`    |
| **RabbitMQ** (container)                | `5672` / `15672` | Broker de mensagens (fila `jobs`, fila `job_events`)              | imagem `rabbitmq:3-management`       |

---

## Estrutura de Pastas

```text
.
├─ api/
│  ├─ src/
│  │  ├─ rabbit.js
│  │  └─ server.js
│  ├─ worker.js
│  ├─ package.json
│  └─ .env
├─ notifier/
│  ├─ src/
│  │  └─ server.js
│  ├─ package.json
│  └─ .env
├─ index.html
└─ docker-compose.yml            # (opcional)
```

---

## Pré-requisitos

| Ferramenta  | Versão sugerida       | Observação                         |
| ----------- | --------------------- | ---------------------------------- |
| **Node.js** | ≥ 18 LTS              | Inclui `npm`                       |
| **Docker**  | Qualquer versão atual | Facilita subir RabbitMQ e serviços |
| Navegador   | Chrome, Firefox, Edge | Para abrir `index.html`            |

---

## Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/MarioMatheusPombal/RabbitMQ-SistemasDistribuidos.git
cd sistema-distribuido-rabbitmq
```

### 2. Instalar dependências

```bash
# API + Worker
cd api
npm install

# Notifier
cd ../notifier
npm install
```

---

## Execução Manual (vários terminais)

> Útil para desenvolvimento e depuração rápida.

### 1. Subir o RabbitMQ

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
# painel: http://localhost:15672  (guest / guest)
```

### 2. Ajustar variáveis `.env`

```
# api/.env
RABBIT_URL=amqp://guest:guest@localhost:5672
PORT=3000

# notifier/.env
RABBIT_URL=amqp://guest:guest@localhost:5672
EVENT_QUEUE=job_events
PORT=3001
```

### 3. Rodar cada serviço

| Terminal     | Comando                             |
| ------------ | ----------------------------------- |
| **API**      | `cd api && node src/server.js`      |
| **Worker**   | `cd api && node worker.js`          |
| **Notifier** | `cd notifier && node src/server.js` |

### 4. Abrir a interface

Basta abrir o arquivo `index.html` no navegador (ou servir com *Live Server*).
Preencha o JSON e clique **Enviar**.

---

## Execução com Docker Compose (atalho)

> Recomendado para testes rápidos ou CI.

1. Verifique/corrija as variáveis de ambiente no `docker-compose.yml`.
2. Execute:

```bash
docker compose up -d      # sobe tudo
docker compose logs -f    # acompanha logs
docker compose down       # encerra
```

A interface continua sendo servida como arquivo estático; mantenha `index.html` aberto apontando para `localhost`.

---

## Fluxo de Teste

1. **Interface** faz `POST /jobs`; API responde `202 {jobId}`.
2. **Worker** registra no log `Recebido job <id>` → dois segundos depois `finalizado`.
3. **Notifier** emite `job_done`; navegador exibe `tarefa <id> concluída ✅`.
4. Painel do RabbitMQ mostra decremento nas filas.

---

## Variáveis de Ambiente

| Variável      | Default                             | Componente     | Descrição                         |
| ------------- | ----------------------------------- | -------------- | --------------------------------- |
| `RABBIT_URL`  | `amqp://guest:guest@localhost:5672` | todos          | URI de conexão ao RabbitMQ        |
| `PORT`        | `3000` / `3001`                     | API / Notifier | Porta HTTP de cada serviço        |
| `EVENT_QUEUE` | `job_events`                        | Notifier       | Fila que contém eventos para a UI |

> **Dica:** Para ambiente de produção use usuários dedicados e URLs dentro da rede privada (ex.: `amqp://app:senha@rabbitmq:5672`).

---

## Possíveis Erros & Soluções

| Sintoma                               | Possível causa                                                       | Correção                                                 |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| **`NetworkError… CORS`** no navegador | API não envia cabeçalhos *CORS*                                      | `npm i cors` e `app.use(cors())` (já incluído)           |
| `ECONNREFUSED: 127.0.0.1:5672`        | RabbitMQ não está rodando                                            | `docker ps`; se ausente → `docker start rabbitmq`        |
| WebSocket 400 / “end does not exist”  | Interface usando WebSocket puro e Notifier Socket.IO (ou vice-versa) | Garanta que ambos usem Socket.IO ou ambos WebSocket puro |
| Mensagens não são consumidas          | `channel.ack` não executa (erro no worker)                           | Ver logs do Worker; trate exceções e confirme `ack`      |

---

## Próximos Passos

* Autenticar a API (JWT, chaves) e o Socket.IO (token por *query* ou cookie).
* Adicionar testes automatizados de integração.
* Empacotar cada serviço em **Dockerfiles** slim (`node:18-alpine`) para produção.
* Configurar **Kubernetes** ou **Docker Swarm** para escalonar múltiplos Workers/Notifiers.
* Implementar DLQ (Dead Letter Queue) e monitoramento (Prometheus + Grafana).

---

> **Licença**: MIT – use à vontade e envie PRs!
> **Contato**: [mariomatheuspombal@gmail.com](mailto:mariomatheuspombal@gmail.com)
