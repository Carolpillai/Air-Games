# 🚀 Air Games - Setup & Run Guide

## Prerequisites

Before running the application, make sure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - Choose one:
   - **Local MongoDB**: [Download here](https://www.mongodb.com/try/download/community)
   - **MongoDB Atlas** (Cloud - Free tier available): [Sign up here](https://www.mongodb.com/cloud/atlas)
3. **Angular CLI** (v17+) - Will be installed automatically with npm

## 📋 Step-by-Step Setup

### Step 1: Install MongoDB

#### Option A: Local MongoDB
1. Download and install MongoDB Community Edition
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac/Linux**: Run `mongod` in terminal
3. Verify it's running by checking `http://localhost:27017`

#### Option B: MongoDB Atlas (Cloud - Recommended for beginners)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/air-games`)
5. Update the `.env` file in the backend folder with your connection string

### Step 2: Setup Backend

1. Open a terminal/command prompt

2. Navigate to the backend folder:
```bash
cd "c:\Users\Carol Pillai\Desktop\College\Projects\air-games\backend"
```

3. Install backend dependencies:
```bash
npm install
```

4. Configure environment variables:
   - The `.env` file is already created
   - If using MongoDB Atlas, edit `.env` and replace `MONGODB_URI` with your Atlas connection string
   - Example: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/air-games`

5. Start the backend server:
```bash
npm start
```

   Or for development with auto-reload:
```bash
npm run dev
```

   You should see:
   ```
   Connected to MongoDB
   Server running on port 3000
   ```

   ✅ **Backend is now running on `http://localhost:3000`**

### Step 3: Setup Frontend

1. Open a **NEW** terminal/command prompt (keep the backend running)

2. Navigate to the frontend folder:
```bash
cd "c:\Users\Carol Pillai\Desktop\College\Projects\air-games\frontend\air-games-app"
```

3. Install frontend dependencies:
```bash
npm install
```

4. Start the Angular development server:
```bash
ng serve
```

   Or:
```bash
npm start
```

   You should see:
   ```
   ✔ Compiled successfully.
   ** Angular Live Development Server is listening on localhost:4200 **
   ```

   ✅ **Frontend is now running on `http://localhost:4200`**

## 🎮 Running the Application

### On Your Computer (Laptop/Desktop)

1. Open your browser and go to: `http://localhost:4200`
2. You should see the Air Games landing page with pixel-art design
3. Click "Create Room" or select a game
4. Enter your name and select a game type
5. Click "CREATE ROOM"
6. You'll see a QR code - **don't close this page!**

### On Your Phone

1. Open your phone's camera or QR code scanner app
2. Scan the QR code displayed on your laptop screen
3. This will open the controller page on your phone
4. Grant motion sensor permissions when prompted
5. Your phone is now connected as a controller!

### Starting a Game

1. Have at least 2 players join (scan QR codes)
2. As the host, click "START GAME" in the lobby
3. The game will load on your laptop screen
4. Players tilt their phones to control!

## 🔧 Troubleshooting

### Backend Issues

**Problem**: `MongoDB connection error`
- **Solution**: Make sure MongoDB is running
  - Check if MongoDB service is running (Windows: Services app)
  - Try: `mongod` in terminal
  - Or use MongoDB Atlas cloud connection

**Problem**: `Port 3000 already in use`
- **Solution**: Change PORT in `.env` file to another port (e.g., `PORT=3001`)

**Problem**: `Cannot find module`
- **Solution**: Run `npm install` again in the backend folder

### Frontend Issues

**Problem**: `Port 4200 already in use`
- **Solution**: Angular will automatically use the next available port (4201, 4202, etc.)

**Problem**: `Cannot find module '@angular/...'`
- **Solution**: Run `npm install` again in the frontend folder

**Problem**: `ng: command not found`
- **Solution**: Install Angular CLI globally: `npm install -g @angular/cli`

### Mobile Controller Issues

**Problem**: Motion sensors not working on iPhone
- **Solution**: iOS 13+ requires permission. The app will prompt you - click "Allow"

**Problem**: Controller not connecting
- **Solution**: 
  - Make sure phone and laptop are on the same WiFi network
  - Check that backend is running
  - Try refreshing the controller page

**Problem**: QR code not scanning
- **Solution**: 
  - Make sure QR code is fully visible
  - Try increasing screen brightness
  - Manually enter the URL shown below the QR code

## 📱 Testing Without a Phone

You can test the application with multiple browser tabs:
1. Open `http://localhost:4200` in one tab (laptop view)
2. Open `http://localhost:4200/controller?room=YOUR_ROOM_CODE` in another tab (simulate phone)
3. Note: Motion sensors won't work in desktop browsers, but you can test the UI

## 🛑 Stopping the Application

1. **Stop Backend**: In the backend terminal, press `Ctrl + C`
2. **Stop Frontend**: In the frontend terminal, press `Ctrl + C`

## 📝 Quick Commands Reference

```bash
# Backend
cd backend
npm install          # First time only
npm start           # Production mode
npm run dev         # Development mode (auto-reload)

# Frontend
cd frontend/air-games-app
npm install          # First time only
ng serve            # Start dev server
npm start           # Alternative command
```

## 🎯 Next Steps

Once everything is running:
1. ✅ Test room creation
2. ✅ Test QR code scanning
3. ✅ Test motion controls
4. ✅ Play Air Pong!
5. 🚀 Implement remaining games (Snake, Racing, Shooter, Football)

## 💡 Tips

- Keep both terminals open while developing
- Use `npm run dev` for backend to auto-restart on changes
- Use `ng serve` for frontend to auto-reload on changes
- Check browser console (F12) for any errors
- Check terminal output for backend errors

Happy gaming! 🎮
