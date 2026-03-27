import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controller',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './controller.html',
  styleUrl: './controller.css'
})
export class Controller implements OnInit, OnDestroy {
  roomCode: string = '';
  playerName: string = '';
  connected: boolean = false;
  connectionError: string = '';
  permissionGranted: boolean = false;
  isReady: boolean = false;
  currentGameId: string = '';
  instructions: string = 'WAITING FOR GAME TO START...';

  // Sensors data
  tiltX: number = 0;
  tiltY: number = 0;
  useTouch: boolean = true; // Default to touch for safety, but auto-switch
  sensorStatus: string = 'DETECTING SENSORS...';
  activityWaitTime: number = 3000;

  // Gyro detection
  hasGyro: boolean | null = null; // null = still detecting
  gyroChecking: boolean = false;

  dpadActive: { up: boolean; down: boolean; left: boolean; right: boolean } = {
    up: false, down: false, left: false, right: false
  };
  private dpadInterval: any = null;

  // Joystick state
  joystickX = 0;
  joystickY = 0;
  joystickActive = false;
  private joystickDeadzone = 25; // pixels
  private joystickMax = 80;      // max drag radius

  // R-LADDER
  rlPhase = 'waiting';
  rlIsMyTurn = false;
  rlTurnName = '';
  rlTurnColor = '';
  rlDiceValue = 1;
  rlDiceRolled = false;
  rlMoving = false;
  rlQuestion: { text: string; options: string[]; timer: number } | null = null;
  rlResult: { message: string; type: string } | null = null;
  rlPowerUps: any[] = [];
  rlHintUsed = false;
  isRollingLocal = false;

  private drNetTO: any;

  private socket: Socket | null = null;
  private backendUrl = `https://air-games.onrender.com`;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.roomCode = (params['roomCode'] || '').toUpperCase();
    });

    this.route.queryParams.subscribe(params => {
      if (params['api']) {
        this.backendUrl = params['api'];
      }
      this.cdr.detectChanges();
    });

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      this.sensorStatus = '⚠️ TILT USES HTTPS';
    }

    // Probe for gyroscope hardware as early as possible
    this.gyroChecking = true;
    this.detectGyro().then(result => {
      this.hasGyro = result;
      this.gyroChecking = false;
      this.sensorStatus = result ? '🔄 GYRO DETECTED' : '🎮 NO GYRO — D-PAD READY';
      this.cdr.detectChanges();
    });
  }

  joinRoom() {
    if (!this.playerName) {
      this.playerName = 'PLAYER_' + Math.floor(Math.random() * 1000);
    }
    this.initSocket();
  }

  setReady() {
    if (!this.connected) return;

    this.requestPermissions().then(() => {
      this.isReady = true;
      this.socket?.emit('player-ready', {
        roomCode: this.roomCode,
        playerId: this.socket.id,
        playerName: this.playerName
      });

      if (this.hasGyro) {
        // Monitor if sensors actually move
        let activityDetected = false;
        const checkActivity = (e: any) => {
          if (e.beta !== 0 || e.gamma !== 0 || e.alpha !== 0) {
            activityDetected = true;
            this.useTouch = false;
            this.sensorStatus = '✅ TILT ACTIVE';
            window.removeEventListener('deviceorientation', checkActivity);
            this.cdr.detectChanges();
          }
        };

        window.addEventListener('deviceorientation', checkActivity);

        // Auto-fallback after activityWaitTime if no movement
        setTimeout(() => {
          if (!activityDetected) {
            this.sensorStatus = '⚠️ SENSORS IDLE. USING TOUCH.';
            this.useTouch = true;
            this.cdr.detectChanges();
          }
        }, this.activityWaitTime);
      } else {
        // No gyro — stay in D-pad mode
        this.useTouch = false; // disable touch blob; we use D-pad instead
        this.sensorStatus = '🎮 D-PAD CONTROL';
      }

      this.cdr.detectChanges();
    });
  }

  /** Probe for real gyroscope hardware. Resolves with true/false. */
  private detectGyro(): Promise<boolean> {
    return new Promise((resolve) => {
      const DeviceOrientation = (window as any).DeviceOrientationEvent;

      // If the API doesn't exist at all, no gyro
      if (!DeviceOrientation) { resolve(false); return; }

      let resolved = false;
      const probe = (e: DeviceOrientationEvent) => {
        window.removeEventListener('deviceorientation', probe);
        // A real gyro fires events with non-null values
        const hasData = e.alpha !== null || e.beta !== null || e.gamma !== null;
        resolved = true;
        resolve(hasData);
      };

      window.addEventListener('deviceorientation', probe);

      // If no event fires in 600ms, assume no gyro
      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('deviceorientation', probe);
          resolve(false);
        }
      }, 600);
    });
  }

  // ---- D-pad controls (no-gyro fallback) ----
  onDpadPress(dir: 'up' | 'down' | 'left' | 'right') {
    if (!this.isReady || !this.socket?.connected) return;
    this.dpadActive[dir] = true;

    // Map D-pad directions to beta/gamma values matching tilt
    const map: Record<string, { beta: number; gamma: number }> = {
      up: { beta: -45, gamma: 0 },
      down: { beta: 45, gamma: 0 },
      left: { beta: 0, gamma: -45 },
      right: { beta: 0, gamma: 45 }
    };
    const { beta, gamma } = map[dir];
    this.tiltX = gamma;
    this.tiltY = beta;

    // Stream continuously while held
    if (!this.dpadInterval) {
      this.dpadInterval = setInterval(() => {
        if (this.socket?.connected) {
          const active = Object.entries(this.dpadActive).find(([, v]) => v);
          if (active) {
            const d = active[0] as 'up' | 'down' | 'left' | 'right';
            const { beta: b, gamma: g } = map[d];
            this.socket.emit('motion-data', {
              roomCode: this.roomCode,
              playerName: this.playerName,
              beta: b, gamma: g,
              isDpad: true
            });
          }
        }
      }, 50);
    }
    this.cdr.detectChanges();
  }

  onDpadRelease(dir: 'up' | 'down' | 'left' | 'right') {
    this.dpadActive[dir] = false;
    const anyActive = Object.values(this.dpadActive).some(v => v);
    if (!anyActive) {
      clearInterval(this.dpadInterval);
      this.dpadInterval = null;
      this.tiltX = 0;
      this.tiltY = 0;
      // Send a neutral/stop signal
      this.socket?.emit('motion-data', {
        roomCode: this.roomCode,
        playerName: this.playerName,
        beta: 0, gamma: 0, isDpad: true
      });
    }
    this.cdr.detectChanges();
  }

  // --- Virtual Joystick Handles ---
  onJoystickDown(e: TouchEvent) {
    if (!this.isReady || !this.socket?.connected) return;
    this.joystickActive = true;
    this.updateJoystick(e);
  }

  onJoystickMove(e: TouchEvent) {
    if (!this.joystickActive) return;
    this.updateJoystick(e);
  }

  onJoystickUp() {
    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;
    this.tiltX = 0;
    this.tiltY = 0;
    this.socket?.emit('motion-data', { roomCode: this.roomCode, playerName: this.playerName, beta: 0, gamma: 0, isDpad: true });
    this.cdr.detectChanges();
  }

  private updateJoystick(e: TouchEvent) {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return; // jitter

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, this.joystickMax);
    
    this.joystickX = Math.cos(angle) * clampedDist;
    this.joystickY = Math.sin(angle) * clampedDist;

    if (clampedDist > this.joystickDeadzone) {
      // Determine dominant direction
      let dir: 'up' | 'down' | 'left' | 'right' | null = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }

      const map: Record<string, { beta: number; gamma: number }> = {
        up: { beta: -45, gamma: 0 },
        down: { beta: 45, gamma: 0 },
        left: { beta: 0, gamma: -45 },
        right: { beta: 0, gamma: 45 }
      };

      const { beta, gamma } = map[dir];
      this.tiltX = gamma;
      this.tiltY = beta;
      this.socket?.emit('motion-data', { roomCode: this.roomCode, playerName: this.playerName, beta, gamma, isDpad: true });
    }
    this.cdr.detectChanges();
  }

  // --- Racing Boost ---
  onRacingBoost(active: boolean) {
    if (!this.isReady || !this.socket?.connected || this.currentGameId !== 'air-racing') return;
    this.socket.emit('player-motion', {
      roomCode: this.roomCode,
      playerName: this.playerName,
      action: { type: 'racing-boost', active }
    });
  }


  rlRollDie() {
    if (!this.rlIsMyTurn || this.rlDiceRolled || this.rlMoving || this.isRollingLocal) return;
    this.isRollingLocal = true;
    this.socket?.emit('motion-data', {
      roomCode: this.roomCode,
      playerName: this.playerName,
      action: { type: 'rl-roll' }
    });
    // Auto-stop local roll if socket takes too long
    setTimeout(() => { this.isRollingLocal = false; this.cdr.detectChanges(); }, 2000);
  }

  rlAnswer(idx: number) {
    if (!this.rlIsMyTurn || this.rlPhase !== 'question') return;
    this.socket?.emit('motion-data', {
      roomCode: this.roomCode,
      playerName: this.playerName,
      action: { type: 'rl-answer', idx }
    });
  }

  rlUseHint() {
    if (!this.rlIsMyTurn || !this.rlQuestion || this.rlHintUsed) return;
    this.socket?.emit('motion-data', {
      roomCode: this.roomCode,
      playerName: this.playerName,
      action: { type: 'rl-use-hint' }
    });
  }

  forceTiltMode() {
    this.useTouch = false;
    this.sensorStatus = '💪 TILT FORCED';
    this.startStreaming();
    this.cdr.detectChanges();
  }

  initSocket() {
    this.socket = io(this.backendUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.connectionError = '';
      this.socket?.emit('join-room', {
        roomCode: this.roomCode,
        type: 'controller',
        playerName: this.playerName
      });
      this.cdr.detectChanges();
    });

    this.socket.on('connect_error', (error) => {
      this.connectionError = 'CONNECTION FAILED. CHECK WIFI.';
      this.cdr.detectChanges();
    });

    this.socket.on('game-started', (data: any) => {
      this.currentGameId = data.gameId;
      this.isReady = true;
      this.updateInstructions(data.gameId);
      this.cdr.detectChanges();
    });

    // Receive room info so we know the game type before it starts
    this.socket.on('room-info', (data: any) => {
      if (data?.gameId) {
        this.currentGameId = data.gameId;
        this.updateInstructions(data.gameId);
        this.cdr.detectChanges();
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.cdr.detectChanges();
    });

    this.setupRLListeners();
  }

  updateInstructions(gameId: string) {
    const map: any = {
      'air-pong': 'TILT FRONT/BACK TO MOVE PADDLE',
      'multiplayer-snake': 'TILT TO CHANGE DIRECTION',
      'air-racing': 'TILT LIKE A STEERING WHEEL',
      'r-ladder': 'WAITING FOR YOUR TURN ⏳',
    };
    this.instructions = map[gameId] || 'GAME STARTED!';
  }


  private setupRLListeners() {
    this.socket?.on('game-event', (d: any) => {
      if (d.command !== 'rl-state') return;
      this.currentGameId = 'r-ladder';
      this.rlPhase = d.phase;
      this.rlTurnName = d.currentPlayerName;
      this.rlTurnColor = d.currentPlayerColor;
      this.rlIsMyTurn = d.currentPlayerSocketId === this.socket?.id;
      this.rlDiceValue = d.diceValue;
      this.rlDiceRolled = d.diceRolled;
      this.rlMoving = d.moving;
      this.rlQuestion = d.question;
      this.rlResult = d.result;
      this.rlPowerUps = d.powerUps || [];
      this.rlHintUsed = d.hintUsed;

      if (this.rlDiceRolled) {
        this.isRollingLocal = false;
      }

      if (this.rlIsMyTurn) {
        if (this.rlPhase === 'playing' && !this.rlDiceRolled) this.instructions = 'YOUR TURN! TAP TO ROLL!';
        else if (this.rlPhase === 'question') this.instructions = 'ANSWER QUICKLY!';
        else if (this.rlPhase === 'result') this.instructions = 'CHECK THE RESULT!';
        else this.instructions = 'WAITING...';
      } else {
        this.instructions = `WAITING FOR ${this.rlTurnName.toUpperCase()}...`;
      }
      this.cdr.detectChanges();
    });
  }

  async requestPermissions() {
    const DeviceOrientation = (window as any).DeviceOrientationEvent;

    if (!this.hasGyro) {
      // No gyro hardware — skip permission request entirely
      this.permissionGranted = false;
      this.cdr.detectChanges();
      return;
    }

    if (DeviceOrientation && typeof DeviceOrientation.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        if (response === 'granted') {
          this.permissionGranted = true;
          this.startStreaming();
        } else {
          this.useTouch = true;
        }
      } catch (err) {
        console.error('Permission error:', err);
        this.useTouch = true;
      }
    } else {
      this.permissionGranted = true;
      this.startStreaming();
    }
    this.cdr.detectChanges();
  }

  startStreaming() {
    window.addEventListener('deviceorientation', (event) => {
      if (!this.isReady) return;

      // Normalize orientation based on how most people hold their phones
      // For forward/backward tilt (Pong up/down), beta is the key
      let beta = event.beta || 0;
      let gamma = event.gamma || 0;

      this.tiltX = gamma;
      this.tiltY = beta;

      if (this.socket?.connected) {
        this.socket.emit('motion-data', {
          roomCode: this.roomCode,
          playerName: this.playerName,
          beta: beta,
          gamma: gamma,
          alpha: event.alpha
        });
      }
      this.cdr.detectChanges();
    }, true);

    window.addEventListener('devicemotion', (event) => {
      if (!this.isReady || !this.socket?.connected) return;
      const acc = event.accelerationIncludingGravity;
      if (acc) {
        const total = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
        if (total > 20) {
          this.socket.emit('motion-data', {
            roomCode: this.roomCode,
            playerName: this.playerName,
            shake: true
          });
        }
      }
    }, true);
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isReady || !this.socket?.connected) return;
    event.preventDefault();

    const touch = event.touches[0];
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const relativeY = ((touch.clientY - rect.top) / rect.height - 0.5) * 90;
    const relativeX = ((touch.clientX - rect.left) / rect.width - 0.5) * 90;

    this.tiltX = relativeX;
    this.tiltY = relativeY;

    this.socket.emit('motion-data', {
      roomCode: this.roomCode,
      playerName: this.playerName,
      gamma: relativeX,
      beta: relativeY,
      isTouch: true
    });

    this.cdr.detectChanges();
  }



  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.dpadInterval) {
      clearInterval(this.dpadInterval);
    }
  }
}

