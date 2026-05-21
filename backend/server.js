require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');
const setupSocket = require('./socket/tokenSocket');

async function start() {
  await db.init();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  app.use(cors());
  app.use(express.json());
  app.use((req, _, next) => { req.io = io; next(); });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/superadmin', require('./routes/superadmin'));
  app.use('/api/patients', require('./routes/patients'));
  app.use('/api/doctors', require('./routes/doctors'));
  app.use('/api/appointments', require('./routes/appointments'));
  app.use('/api/prescriptions', require('./routes/prescriptions'));
  app.use('/api/tokens', require('./routes/tokens'));
  app.use('/api/medicines', require('./routes/medicines'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/reception-charges', require('./routes/receptionCharges'));
  app.use('/api/ocr', require('./routes/ocr'));

  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });

  setupSocket(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch(console.error);
