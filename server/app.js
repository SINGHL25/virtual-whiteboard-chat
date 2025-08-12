
// server/app.js
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const sockets = require('./sockets');
const config = require('./config/default.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // allow base64 snapshots

// serve client static files
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// simple health route
app.get('/health', (req, res) => res.json({ ok: true }));

// admin route (simple)
app.post('/admin/clear-room', (req, res) => {
  const { roomId, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET && secret !== config.adminSecret) return res.status(403).send('forbidden');
  sockets.clearRoom(roomId);
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6
});

sockets.attach(io);

const PORT = process.env.PORT || config.port || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
