const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { generateRoomCode } = require('../utils/roomCode');
const QRCode = require('qrcode');
const os = require('os');

// Helper function to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Create a new room
router.post('/', async (req, res) => {
  try {
    const { gameType, playerName } = req.body;
    
    if (!gameType || !playerName) {
      return res.status(400).json({ error: 'Game type and player name are required' });
    }

    const roomCode = generateRoomCode();
    const room = new Room({
      roomCode,
      gameType,
      maxPlayers: getMaxPlayersForGame(gameType),
      players: [{
        socketId: 'host', // Will be updated when socket connects
        playerName,
        isHost: true
      }]
    });

    await room.save();

    // Generate QR code - use local IP for phone access
    const localIP = getLocalIP();
    const port = process.env.PORT || 3000;
    const frontendPort = process.env.FRONTEND_PORT || '4200';
    
    // Use local IP if available, otherwise fallback to FRONTEND_URL
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || frontendUrl.includes('localhost')) {
      frontendUrl = `http://${localIP}:${frontendPort}`;
    }
    
    const joinUrl = `${frontendUrl}/controller?room=${roomCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);

    res.json({
      roomCode,
      qrCode: qrCodeDataUrl,
      joinUrl,
      room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room details
router.get('/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.code });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

function getMaxPlayersForGame(gameType) {
  const maxPlayers = {
    'air-pong': 2,
    'multiplayer-snake': 8,
    'air-racing': 6,
    'space-shooter': 4,
    'air-football': 6
  };
  return maxPlayers[gameType] || 4;
}

module.exports = router;
