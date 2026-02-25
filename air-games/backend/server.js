const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const qrcode = require('qrcode');
const dotenv = require('dotenv');
const os = require('os');

dotenv.config();

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('virtual') || lowerName.includes('vbox') ||
      lowerName.includes('vmware') || lowerName.includes('vethernet') ||
      lowerName.includes('hyper-v')) {
      continue;
    }

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip common virtual ranges
        if (iface.address.startsWith('192.168.56.') ||
          iface.address.startsWith('192.168.112.') ||
          iface.address.startsWith('192.168.117.')) continue;

        // Prioritize the primary home network range
        if (iface.address.startsWith('192.168.0.')) return iface.address;

        candidates.push(iface.address);
      }
    }
  }
  return candidates.length > 0 ? candidates[0] : 'localhost';
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Carol:rkTIPOjJflJAF5IE@cluster0.9lq5tap.mongodb.net/?appName=Cluster0';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Room Logic
const rooms = new Map(); // For active game state

app.post('/api/rooms', async (req, res) => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const localIp = getLocalIp();

  console.log(`Creating new room: ${roomCode} on IP: ${localIp}`);

  // Prefer the Angular dev server port from the client, but
  // always use the local IP for the host so controllers can join.
  let port = 4200;
  if (req.body?.baseUrl) {
    try {
      const url = new URL(req.body.baseUrl);
      if (url.port) {
        port = url.port;
      }
    } catch {
      // Ignore
    }
  }

  // Use the IP that the server is on, so phones can connect.
  const host = localIp === 'localhost' ? '127.0.0.1' : localIp;
  const baseUrl = req.body?.baseUrl || `http://${host}:4200`;
  const apiTunnel = req.body?.apiTunnel; // Optional backend tunnel URL

  let controllerUrl = `${baseUrl}/controller/${roomCode}`;
  if (apiTunnel) {
    controllerUrl += `?api=${encodeURIComponent(apiTunnel)}`;
  } else if (baseUrl.includes('loca.lt') || baseUrl.includes('ngrok')) {
    // If frontend is tunnelled but no backend tunnel provided, 
    // we still need to point to the local IP of the backend
    controllerUrl += `?api=${encodeURIComponent(`http://${host}:3000`)}`;
  }

  console.log(`Controller URL: ${controllerUrl}`);

  try {
    const qrCodeData = await qrcode.toDataURL(controllerUrl, {
      color: {
        dark: '#E8FF00',
        light: '#000000' // Use solid black instead of transparent for better compatibility
      },
      width: 400,
      margin: 2
    });

    const roomData = {
      code: roomCode,
      players: [],
      gameState: 'waiting',
      baseUrl: req.body?.baseUrl || `http://${host}:4200`,
      createdAt: new Date()
    };

    rooms.set(roomCode, roomData);
    console.log(`Room ${roomCode} initialized and stored.`);

    res.json({ roomCode, qrCode: qrCodeData, controllerUrl });
  } catch (err) {
    console.error(`QR generation error for room ${roomCode}:`, err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

app.get('/api/rooms/:code', async (req, res) => {
  const room = rooms.get(req.params.code);
  if (room) {
    try {
      // Use the stored baseUrl to regenerate the QR code
      const localIp = getLocalIp();
      const host = localIp === 'localhost' ? '127.0.0.1' : localIp;

      // Parse stored baseUrl to get the port
      let port = 4200;
      try {
        const url = new URL(room.baseUrl);
        if (url.port) port = url.port;
      } catch { }

      const controllerUrl = `http://${host}:${port}/controller/${req.params.code}`;
      const qrCodeData = await qrcode.toDataURL(controllerUrl, {
        color: { dark: '#E8FF00', light: '#00000000' },
        width: 400,
        margin: 2
      });
      res.json({ ...room, qrCode: qrCodeData });
    } catch (err) {
      res.json(room);
    }
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomCode, type, playerName }) => {
    socket.join(roomCode);
    console.log(`${type} (${playerName || 'anonymous'}) joined room: ${roomCode}`);

    const room = rooms.get(roomCode);
    if (!room) {
      console.warn(`Attempted join to non-existent room: ${roomCode}`);
      return;
    }

    if (type === 'controller') {
      const player = { id: socket.id, name: playerName || `PLAYER_${Math.floor(Math.random() * 100)}`, score: 0 };
      room.players.push(player);
      // Broadcast to everyone (including the laptop) that a new player joined
      io.to(roomCode).emit('player-joined', player);
    }

    // Always send the current player list to the newly connected client
    socket.emit('room-info', { roomCode, players: room.players, gameState: room.gameState });
  });

  socket.on('motion-data', (data) => {
    if (data.shake) {
      const room = rooms.get(data.roomCode);
      console.log(`[SHAKE] from ${socket.id} in ${data.roomCode}. Player count: ${room?.players?.length || 0}`);
    }
    io.to(data.roomCode).emit('player-motion', { playerId: socket.id, ...data });
  });

  socket.on('start-game', (data) => {
    // data: { roomCode, gameId }
    console.log(`Starting game ${data.gameId} in room ${data.roomCode}`);
    const room = rooms.get(data.roomCode);
    if (room) {
      room.gameState = 'playing';
      io.to(data.roomCode).emit('game-started', data);
    }
  });

  socket.on('game-command', (data) => {
    // data: { roomCode, command }
    io.to(data.roomCode).emit('game-event', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Handle player removal logic here if needed
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
