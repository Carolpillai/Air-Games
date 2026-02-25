---
description: How to run Air Games platform
---
# How to run Air Games

1. **Set Workspace**:
   Set `C:\Users\Carol Pillai\.gemini\antigravity\scratch\air-games` as your active workspace.

2. **Start Backend**:
   - Open a terminal.
// turbo
   - Run: `cd backend; node server.js`
   - The server will run on `http://localhost:3000`.

3. **Start Frontend**:
   - Open another terminal.
// turbo
   - Run: `cd frontend; npm start`
   - The laptop game display will be at `http://localhost:4200`.

4. **Join with Phone**:
   - Open `http://localhost:4200` on your laptop.
   - Click "Create Room".
   - Scan the QR code with your phone (Ensure your phone and laptop are on the same network). 
   - *Note: On local dev, you might need to use your laptop's IP address (e.g., `192.168.x.x:4200`) instead of `localhost` so your phone can reach it.*
