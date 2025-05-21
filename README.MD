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

| Componente | Porta | Responsabilidade | Principais pacotes |
|------------|-------|------------------|--------------------|
| **Interface** (`index.html`) | – | Envia *jobs* pela API e escuta notificações via Socket.IO | `socket.io-client` |
| **API** (`api/src/server.js`) | `3000` | Recebe HTTP `POST /jobs`, gera `jobId` e publica na fila `jobs` | `express`, `amqplib`, `cors`, `uuid` |
| **Worker** (`api/worker.js`) | – | Consome `jobs`, executa a tarefa e publica evento em `job_events` | `amqplib` |
| **Notifier** (`notifier/src/server.js`) | `3001` | Consome `job_events` e empurra para os navegadores via Socket.IO | `express`, `socket.io`, `amqplib` |
| **RabbitMQ** (container) | `5672` / `15672` | Broker de mensagens (fila `jobs`, fila `job_events`) | imagem `rabbitmq:3-management` |

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
