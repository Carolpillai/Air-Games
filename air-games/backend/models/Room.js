const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  playerName: { type: String, required: true },
  playerColor: { type: String, default: '#e8ff00' },
  isHost: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  gameType: { 
    type: String, 
    enum: ['air-pong', 'multiplayer-snake', 'air-racing', 'space-shooter', 'air-football'],
    required: true 
  },
  players: [playerSchema],
  maxPlayers: { type: Number, default: 4 },
  gameState: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  scores: { type: Map, of: Number, default: {} }
});

module.exports = mongoose.model('Room', roomSchema);
