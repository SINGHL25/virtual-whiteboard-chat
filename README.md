# virtual-whiteboard-chat

# Virtual Whiteboard with Chat

Simple starter project: HTML5 Canvas client + Node.js + Socket.IO server.

## Run locally

1. Install
3. Open the client at `http://localhost:3000` (server serves the client static files).

## Features
- Rooms (join by ID)
- Real-time strokes and chat
- Replay buffer for late joiners
- Snapshot upload (base64 PNG saved to `storage/snapshots/`)
- Basic JWT stub (replace with production auth)

## Folder layout
See project root for folder list you requested.

## Next steps
- Replace JWT stub with your auth provider
- Add Redis adapter for Socket.IO in production
- Add S3 persistence for snapshots
