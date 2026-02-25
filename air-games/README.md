# Air Games - MEAN Stack Web Application

A platform where players scan a QR code on their phone to join a room, their phone becomes a motion-sensor controller, and the games are displayed on the laptop browser.

## 🎮 Features

- **Retro Pixel-Art Design**: Dark theme with neon yellow/green accents
- **QR Code Room System**: Easy room creation and joining
- **Motion Sensor Controls**: Use your phone's gyroscope and accelerometer
- **Real-time Multiplayer**: Socket.IO for instant game synchronization
- **5 Games**: Air Pong, Multiplayer Snake, Air Racing, Space Shooter, Air Football

## 🛠️ Tech Stack

- **Frontend**: Angular 17+ (Standalone Components)
- **Backend**: Node.js + Express.js
- **Real-time**: Socket.IO
- **Database**: MongoDB + Mongoose
- **Styling**: CSS with pixel-art theme
- **Fonts**: Google Fonts - Press Start 2P

## 📁 Project Structure

```
air-games/
├── backend/          (Node.js + Express + Socket.IO + MongoDB)
│   ├── server.js
│   ├── routes/
│   │   └── rooms.js
│   ├── models/
│   │   └── Room.js
│   └── utils/
│       └── roomCode.js
├── frontend/         (Angular)
│   └── air-games-app/
│       └── src/app/
│           ├── pages/
│           │   ├── home/           ← Landing page
│           │   ├── lobby/          ← Room creation + QR code
│           │   ├── controller/     ← Mobile controller page
│           │   └── games/
│           │       └── air-pong/   ← Game display
│           └── services/
│               ├── api.service.ts
│               └── socket.service.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- Angular CLI (v17+)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/air-games
FRONTEND_URL=http://localhost:4200
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend/air-games-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
ng serve
```

The frontend will run on `http://localhost:4200`

## 🎯 How to Play

1. **Create a Room**: Go to the home page and click "Create Room" or select a game
2. **Enter Your Name**: Enter your name as the host
3. **Share QR Code**: Players scan the QR code with their phone
4. **Enable Motion**: Players grant motion permission on their phone
5. **Start Game**: Host clicks "Start Game" when ready
6. **Play**: Tilt and move your phone to control the game!

## 🎮 Games

### Air Pong (Implemented)
- Tilt phone left/right to move paddle
- 2 players
- Classic pong gameplay

### Multiplayer Snake (Planned)
- Swipe or tilt to change direction
- Last snake alive wins
- Supports 4+ players

### Air Racing (Planned)
- Tilt phone like steering wheel
- Top-down car race
- Up to 6 players

### Space Shooter (Planned)
- Tilt to move spaceship
- Shake to shoot
- Co-op vs waves of enemies

### Air Football (Planned)
- Tilt to move player
- Flick/jerk phone to kick
- 2v2 or 3v3 matches

## 📱 Mobile Controller

The mobile controller page:
- Requests motion sensor permissions (iOS 13+)
- Reads DeviceOrientationEvent (beta, gamma, alpha)
- Reads DeviceMotionEvent (acceleration)
- Sends motion data to server via Socket.IO every frame
- Shows connection status and game instructions

## 🖥️ Game Display

The game display page:
- Full-screen canvas rendering
- Receives motion data from all players
- Updates game state in real-time
- Shows scores, player names, and room info

## 🔌 API Endpoints

- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:code` - Get room details

## 🔌 Socket.IO Events

### Client → Server
- `join-room` - Join a room with room code
- `motion-data` - Send motion sensor data
- `start-game` - Host starts the game
- `game-state` - Update game state

### Server → Client
- `room-joined` - Confirmation of room join
- `player-joined` - New player joined
- `player-left` - Player disconnected
- `player-motion` - Motion data from a player
- `game-started` - Game has started
- `game-state-update` - Updated game state

## 🎨 Design Theme

- **Background**: Deep dark (#0a0a0f)
- **Primary Color**: Neon yellow/green (#e8ff00)
- **Font**: Press Start 2P (pixel-art style)
- **Effects**: Floating clouds, pixel landscape, animated stars

## 📝 TODO

- [x] Project scaffolding
- [x] Backend setup (Express + Socket.IO + MongoDB)
- [x] Frontend setup (Angular)
- [x] Landing page with pixel-art theme
- [x] Room creation and QR code generation
- [x] Lobby page with player list
- [x] Mobile controller page
- [x] Air Pong game implementation
- [ ] Multiplayer Snake game
- [ ] Air Racing game
- [ ] Space Shooter game
- [ ] Air Football game
- [ ] Score persistence
- [ ] Game history
- [ ] Sound effects

## 📄 License

ISC

## 👨‍💻 Author

Built with MEAN Stack
