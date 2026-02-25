# 🔧 Troubleshooting Guide - Air Games

## Common Issues and Solutions

### Issue: QR Code Not Working / Phone Can't Connect

**Problem**: The QR code uses `localhost` which phones can't access.

**Solution**: 
1. Make sure your phone and laptop are on the **same WiFi network**
2. The app now automatically detects your local IP address
3. If QR code still doesn't work:
   - Look at the URL displayed below the QR code
   - Manually type that URL into your phone's browser
   - The URL should look like: `http://192.168.1.XXX:4200/controller?room=ABC123`

**To find your laptop's IP manually:**
- **Windows**: Open Command Prompt, type `ipconfig`, look for "IPv4 Address"
- **Mac**: System Preferences → Network → WiFi → Advanced → TCP/IP
- **Linux**: Run `ifconfig` or `ip addr`

### Issue: "Room not found" Error

**Possible causes:**
1. Backend server is not running
2. MongoDB is not connected
3. Room was deleted or expired

**Solutions:**
1. Check that backend is running: `http://localhost:3000` should respond
2. Check MongoDB connection in backend terminal
3. Create a new room

### Issue: Players Not Appearing in Lobby

**Possible causes:**
1. Socket.IO connection failed
2. CORS issues
3. Backend not receiving join events

**Solutions:**
1. Open browser console (F12) and check for errors
2. Check backend terminal for connection logs
3. Make sure both frontend and backend are running
4. Verify `FRONTEND_URL` in backend `.env` matches your frontend URL

### Issue: Motion Controls Not Working

**On iPhone:**
- iOS 13+ requires permission - click "ENABLE MOTION CONTROLS" button
- If denied, go to Settings → Safari → Motion & Orientation Access

**On Android:**
- Should work automatically
- Make sure you're using HTTPS or localhost (some browsers require HTTPS for motion sensors)

**General:**
- Make sure you're on the controller page (`/controller?room=XXX`)
- Check browser console for errors
- Try refreshing the page

### Issue: Can't Start Game / "Need at least 2 players"

**Problem**: Host counts as 1 player, need at least 1 more player to start.

**Solution:**
1. Make sure at least one other person has scanned the QR code
2. Check that their phone shows "CONNECTED" status
3. Wait a few seconds for the player list to update
4. If player appears but still can't start, check browser console

### Issue: Game Not Loading After "Start Game"

**Possible causes:**
1. Game route doesn't exist
2. Socket connection lost
3. Room data not found

**Solutions:**
1. Check browser console for routing errors
2. Verify the game component exists: `/games/air-pong`
3. Make sure backend is still running
4. Try refreshing and rejoining

### Issue: Backend Won't Start

**MongoDB Connection Error:**
```
MongoDB connection error: ...
```

**Solutions:**
1. **Local MongoDB**: Make sure MongoDB service is running
   - Windows: Check Services app
   - Mac/Linux: Run `mongod` in terminal
   
2. **MongoDB Atlas**: 
   - Check your connection string in `.env`
   - Make sure IP whitelist includes `0.0.0.0/0` (for testing)
   - Verify username/password are correct

3. **Wrong Port**: Change `MONGODB_URI` in `.env` if MongoDB is on different port

### Issue: Frontend Won't Start

**Angular CLI Not Found:**
```
ng: command not found
```

**Solution:**
```bash
npm install -g @angular/cli
```

**Port Already in Use:**
- Angular will automatically use next available port (4201, 4202, etc.)
- Or kill the process using port 4200

### Issue: CORS Errors

**Error**: `Access-Control-Allow-Origin` errors in browser console

**Solution:**
1. Check `FRONTEND_URL` in backend `.env` matches your frontend URL
2. Make sure backend `server.js` has CORS enabled
3. Restart backend server after changing `.env`

### Issue: Socket.IO Connection Failed

**Error**: `WebSocket connection failed` or `Socket.IO connection error`

**Solutions:**
1. Check backend is running on port 3000
2. Check `FRONTEND_URL` in backend `.env`
3. Make sure firewall isn't blocking port 3000
4. Try restarting both frontend and backend

## Debugging Steps

### Step 1: Check All Services Are Running

**Backend:**
```bash
cd backend
npm start
# Should see: "Server running on port 3000"
# Should see: "Connected to MongoDB"
```

**Frontend:**
```bash
cd frontend/air-games-app
ng serve
# Should see: "Angular Live Development Server is listening on localhost:4200"
```

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

### Step 3: Check Backend Logs

Watch the backend terminal for:
- Socket connections: `Client connected: <socket-id>`
- Room joins: Should see join events
- Errors: Any error messages

### Step 4: Test Socket Connection

1. Open browser console on lobby page
2. Type: `window.io` (should show Socket.IO client)
3. Check Network tab → WS (WebSocket) → Should see connection

### Step 5: Verify URLs

**Backend API:**
- Test: `http://localhost:3000/api/rooms` (should return error, but not 404)

**Frontend:**
- Test: `http://localhost:4200` (should show home page)

**QR Code URL:**
- Should be: `http://YOUR_IP:4200/controller?room=XXX`
- Replace `YOUR_IP` with your laptop's local IP

## Still Having Issues?

1. **Check all prerequisites**: Node.js, MongoDB, Angular CLI
2. **Restart everything**: Backend, Frontend, MongoDB
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check firewall**: Make sure ports 3000 and 4200 aren't blocked
5. **Try different browser**: Chrome/Firefox recommended
6. **Check network**: Phone and laptop must be on same WiFi

## Getting Help

If you're still stuck:
1. Check browser console for specific error messages
2. Check backend terminal for error logs
3. Note down the exact error message
4. Check that all files are saved correctly
