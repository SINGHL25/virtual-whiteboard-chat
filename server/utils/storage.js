// server/utils/storage.js
const fs = require('fs');
const path = require('path');
const config = require('../config/default.json');

const STORAGE_ROOT = process.env.STORAGE_DIR || path.join(__dirname, '..', '..', 'storage');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Append an event (JSON) per room
function appendEvent(roomId, event) {
  const eventsDir = path.join(STORAGE_ROOT, 'events');
  ensureDir(eventsDir);
  const file = path.join(eventsDir, `${roomId}.ndjson`);
  fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
}

// Clear events for a room
function clearEvents(roomId) {
  const file = path.join(STORAGE_ROOT, 'events', `${roomId}.ndjson`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Save base64 PNG snapshot, return relative path
async function saveSnapshot(roomId, pngBase64) {
  const snapsDir = path.join(STORAGE_ROOT, 'snapshots');
  ensureDir(snapsDir);
  const data = pngBase64.replace(/^data:image\/png;base64,/, '');
  const filename = `${roomId}-${Date.now()}.png`;
  const outPath = path.join(snapsDir, filename);
  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  return `/storage/snapshots/${filename}`; // note: serving these files would require an express static route (optional)
}

module.exports = { appendEvent, clearEvents, saveSnapshot };
