
// server/routes/index.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ ok: true, service: 'virtual-whiteboard' }));

module.exports = router;
