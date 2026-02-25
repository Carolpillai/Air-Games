import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { ApiService } from '../../services/api.service';

interface MotionData {
  beta: number;
  gamma: number;
  alpha: number;
  shake: boolean;
  acceleration?: { x: number; y: number; z: number };
}

@Component({
  selector: 'app-controller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controller.html',
  styleUrl: './controller.css'
})
export class ControllerComponent implements OnInit, OnDestroy {
  roomCode: string = '';
  playerName: string = '';
  connected: boolean = false;
  motionSupported: boolean = false;
  permissionGranted: boolean = false;
  gameType: string = '';
  instructions: string = '';
  lastShakeTime: number = 0;
  lastAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['room'] || '';
      if (this.roomCode) {
        this.joinRoom();
      }
    });

    this.checkMotionSupport();
    this.socketService.connect();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  joinRoom(): void {
    if (!this.roomCode) return;

    // Get player name from prompt or use default
    const storedName = localStorage.getItem('playerName');
    this.playerName = storedName || `Player${Math.floor(Math.random() * 1000)}`;
    
    if (!storedName) {
      const name = prompt('Enter your name:');
      if (name) {
        this.playerName = name;
        localStorage.setItem('playerName', name);
      }
    }

    // Get room info
    this.apiService.getRoom(this.roomCode).subscribe({
      next: (room) => {
        this.gameType = room.gameType;
        this.updateInstructions();
        this.socketService.joinRoom(this.roomCode, this.playerName, false);
      },
      error: (err) => {
        console.error('Failed to get room:', err);
      }
    });
  }

  checkMotionSupport(): void {
    this.motionSupported = 
      'DeviceOrientationEvent' in window || 
      'DeviceMotionEvent' in window;
  }

  requestPermission(): void {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // iOS 13+ requires permission
      (DeviceMotionEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            this.permissionGranted = true;
            this.startMotionTracking();
          } else {
            alert('Motion permission denied. Please enable it in settings.');
          }
        })
        .catch(() => {
          alert('Failed to request motion permission.');
        });
    } else {
      // Android/other browsers
      this.permissionGranted = true;
      this.startMotionTracking();
    }
  }

  startMotionTracking(): void {
    if (!this.permissionGranted) return;

    // Device Orientation (beta, gamma, alpha)
    window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
      const motionData: MotionData = {
        beta: event.beta || 0,
        gamma: event.gamma || 0,
        alpha: event.alpha || 0,
        shake: false
      };
      this.sendMotionData(motionData);
    });

    // Device Motion (acceleration)
    window.addEventListener('devicemotion', (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (accel) {
        const currentAccel = { x: accel.x || 0, y: accel.y || 0, z: accel.z || 0 };
        
        // Detect shake (rapid acceleration change)
        const shakeThreshold = 15;
        const deltaX = Math.abs(currentAccel.x - this.lastAcceleration.x);
        const deltaY = Math.abs(currentAccel.y - this.lastAcceleration.y);
        const deltaZ = Math.abs(currentAccel.z - this.lastAcceleration.z);
        
        const isShaking = (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) &&
          (Date.now() - this.lastShakeTime > 200); // Debounce shake detection

        if (isShaking) {
          this.lastShakeTime = Date.now();
        }

        const motionData: MotionData = {
          beta: 0,
          gamma: 0,
          alpha: 0,
          shake: isShaking,
          acceleration: currentAccel
        };
        
        this.lastAcceleration = currentAccel;
        this.sendMotionData(motionData);
      }
    });
  }

  sendMotionData(motionData: MotionData): void {
    if (this.connected && this.roomCode) {
      this.socketService.sendMotionData(this.roomCode, motionData);
    }
  }

  setupSocketListeners(): void {
    this.socketService.onRoomJoined().subscribe((data: any) => {
      this.connected = true;
      this.gameType = data.gameType;
      this.updateInstructions();
    });

    this.socketService.onError().subscribe((data: any) => {
      alert(data.message || 'Connection error');
    });
  }

  updateInstructions(): void {
    const instructionsMap: { [key: string]: string } = {
      'air-pong': 'Tilt your phone left/right to move the paddle',
      'multiplayer-snake': 'Tilt or swipe to change snake direction',
      'air-racing': 'Tilt your phone like a steering wheel to steer',
      'space-shooter': 'Tilt to move, shake to shoot',
      'air-football': 'Tilt to move, flick sharply to kick'
    };
    this.instructions = instructionsMap[this.gameType] || 'Tilt your phone to control';
  }
}
