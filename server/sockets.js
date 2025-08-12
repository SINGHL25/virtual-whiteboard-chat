
// server/sockets.js
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config/default.json');
const utils = require('./utils/storage');

const ROOM_BUFFER_LIMIT = 5000;
const replayBuffers = new Map();

const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function attach(io) {
  io.on('connection', (socket) => {
    console.log('connected', socket.id);

    socket.on('join-room', (payload) => {
      const { roomId = 'default', token, username } = payload || {};
      const user = verifyToken(token) || { username: username || `user-${socket.id.slice(0,4)}` };
      socket.data.user = user;
      socket.join(roomId);
      console.log(`${user.username} joined ${roomId}`);

      // send replay
      const buf = replayBuffers.get(roomId) || [];
      socket.emit('replay-buffer', buf);

      socket.to(roomId).emit('user-joined', { socketId: socket.id, username: user.username });
    });

    socket.on('stroke', ({ roomId, stroke }) => {
      if (!roomId || !stroke) return;
      let buf = replayBuffers.get(roomId);
      if (!buf) { buf = []; replayBuffers.set(roomId, buf); }
      buf.push({ id: uuidv4(), type: 'stroke', payload: stroke, ts: Date.now() });
      if (buf.length > ROOM_BUFFER_LIMIT) buf.shift();

      socket.to(roomId).emit('stroke', stroke);
      utils.appendEvent(roomId, { type: 'stroke', payload: stroke, ts: Date.now() });
    });

    socket.on('chat', ({ roomId, message }) => {
      if (!roomId || !message) return;
      const user = socket.data.user || {};
      const payload = { message, username: user.username || 'anon', ts: Date.now() };
      let buf = replayBuffers.get(roomId);
      if (!buf) { buf = []; replayBuffers.set(roomId, buf); }
      buf.push({ id: uuidv4(), type: 'chat', payload, ts: Date.now() });
      if (buf.length > ROOM_BUFFER_LIMIT) buf.shift();

      io.to(roomId).emit('chat', payload);
      utils.appendEvent(roomId, { type: 'chat', payload, ts: Date.now() });
    });

    socket.on('clear-board', ({ roomId }) => {
      if (!roomId) return;
      const buf = replayBuffers.get(roomId) || [];
      replayBuffers.set(roomId, buf.filter(e => e.type !== 'stroke'));
      io.to(roomId).emit('clear-board');
      utils.appendEvent(roomId, { type: 'clear', ts: Date.now() });
    });

    socket.on('snapshot', async ({ roomId, pngBase64 }) => {
      if (!roomId || !pngBase64) return;
      try {
        const url = await utils.saveSnapshot(roomId, pngBase64);
        io.to(roomId).emit('snapshot-saved', { url });
      } catch (err) {
        console.error('snapshot save error', err);
      }
    });

    socket.on('disconnecting', () => {
      const rooms = Array.from(socket.rooms);
      rooms.forEach(r => {
        if (r !== socket.id) socket.to(r).emit('user-left', { socketId: socket.id, username: socket.data?.user?.username });
      });
    });

    socket.on('disconnect', (reason) => {
      // no-op
    });
  });
}

function clearRoom(roomId) {
  replayBuffers.delete(roomId);
  utils.clearEvents(roomId);
}

module.exports = { attach, clearRoom };
