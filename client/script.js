
// client/script.js
const socket = io(); // served from server

// UI elements
const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-input');
const nameInput = document.getElementById('name-input');
const clearBtn = document.getElementById('clear-btn');
const snapshotBtn = document.getElementById('snapshot-btn');

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let drawing = false;
let last = null;
const colorEl = document.getElementById('color');
const widthEl = document.getElementById('width');

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

let currentRoom = null;

function drawLine(x1,y1,x2,y2, color, w, emit=false) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
  ctx.closePath();
  if (emit && currentRoom) {
    const stroke = { x:x2, y:y2, px:x1, py:y1, color, width: w, t: Date.now() };
    socket.emit('stroke', { roomId: currentRoom, stroke });
  }
}

// mouse
canvas.addEventListener('mousedown', (e)=>{
  drawing = true;
  last = { x: e.offsetX, y: e.offsetY };
});
canvas.addEventListener('mouseup', ()=> { drawing = false; last = null; });
canvas.addEventListener('mouseleave', ()=> { drawing = false; last = null; });
canvas.addEventListener('mousemove', (e)=>{
  if (!drawing || !last) return;
  const x = e.offsetX, y = e.offsetY;
  drawLine(last.x, last.y, x, y, colorEl.value, parseInt(widthEl.value), true);
  last = { x, y };
});

// touch
canvas.addEventListener('touchstart', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  last = { x: t.clientX - rect.left, y: t.clientY - rect.top };
  drawing = true;
});
canvas.addEventListener('touchmove', (e)=>{
  e.preventDefault();
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  const x = t.clientX - rect.left, y = t.clientY - rect.top;
  drawLine(last.x, last.y, x, y, colorEl.value, parseInt(widthEl.value), true);
  last = { x,y };
});
canvas.addEventListener('touchend', ()=> { drawing = false; last=null; });

// join
joinBtn.addEventListener('click', ()=>{
  const roomId = (roomInput.value || 'default').trim();
  const username = (nameInput.value || 'anon').trim();
  currentRoom = roomId;
  socket.emit('join-room', { roomId, token: null, username });
  appendChatSystem(`Joined room: ${roomId}`);
});

// replay buffer
socket.on('replay-buffer', (events) => {
  if (!events || !events.length) return;
  events.forEach(e => {
    if (e.type === 'stroke') {
      const s = e.payload;
      drawLine(s.px, s.py, s.x, s.y, s.color, s.width, false);
    } else if (e.type === 'chat') {
      appendChat(e.payload.username, e.payload.message, e.payload.ts);
    }
  });
});

// receive events
socket.on('stroke', (s) => drawLine(s.px, s.py, s.x, s.y, s.color, s.width, false));
socket.on('clear-board', () => ctx.clearRect(0,0,canvas.width, canvas.height));
socket.on('chat', (payload) => appendChat(payload.username, payload.message, payload.ts));
socket.on('snapshot-saved', ({ url }) => appendChatSystem(`Snapshot saved: ${url}`));

chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') sendChat(); });

function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg || !currentRoom) return;
  socket.emit('chat', { roomId: currentRoom, message: msg });
  chatInput.value = '';
}
function appendChat(user, msg, ts) {
  const d = new Date(ts || Date.now());
  const el = document.createElement('div');
  el.innerHTML = `<strong>${escapeHtml(user)}</strong> <span class="small">[${d.toLocaleTimeString()}]</span>: ${escapeHtml(msg)}`;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function appendChatSystem(msg) {
  const el = document.createElement('div');
  el.style.fontStyle = 'italic';
  el.style.color = '#666';
  el.textContent = msg;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function escapeHtml(s) {
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

// clear
clearBtn.addEventListener('click', ()=>{
  if (!currentRoom) return alert('Join a room first.');
  socket.emit('clear-board', { roomId: currentRoom });
  ctx.clearRect(0,0,canvas.width, canvas.height);
});

// snapshot
snapshotBtn.addEventListener('click', async ()=>{
  if (!currentRoom) return alert('Join a room first.');
  const png = canvas.toDataURL('image/png');
  socket.emit('snapshot', { roomId: currentRoom, pngBase64: png });
  appendChatSystem('Snapshot sent (demo)');
});
