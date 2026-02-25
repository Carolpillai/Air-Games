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

  private socket: Socket | null = null;
  private backendUrl = `http://${window.location.hostname}:3000`;

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

      // Monitor if sensors actually move
      let activityDetected = false;
      const checkActivity = (e: any) => {
        // High sensitivity check: even a tiny change from 0 is activity
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

      this.cdr.detectChanges();
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
      this.updateInstructions(data.gameId);
      this.cdr.detectChanges();
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.cdr.detectChanges();
    });
  }

  updateInstructions(gameId: string) {
    const map: any = {
      'air-pong': 'TILT FRONT/BACK TO MOVE PADDLE',
      'multiplayer-snake': 'TILT TO CHANGE DIRECTION',
      'air-racing': 'TILT LIKE A STEERING WHEEL',
      'space-shooter': 'TILT TO MOVE • SHAKE TO SHOOT'
    };
    this.instructions = map[gameId] || 'GAME STARTED!';
  }

  async requestPermissions() {
    const DeviceOrientation = (window as any).DeviceOrientationEvent;

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
  }
}
