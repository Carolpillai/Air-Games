import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService, PlayerMotion } from '../../../services/socket.service';
import { ApiService, Player } from '../../../services/api.service';

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  playerName: string;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  speed: number;
}

@Component({
  selector: 'app-air-pong',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './air-pong.html',
  styleUrl: './air-pong.css'
})
export class AirPongComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId: number = 0;
  
  roomCode: string = '';
  players: Player[] = [];
  paddles: Map<string, Paddle> = new Map();
  ball: Ball = {
    x: 0,
    y: 0,
    radius: 10,
    vx: 5,
    vy: 5,
    speed: 5
  };
  
  score: Map<string, number> = new Map();
  gameStarted: boolean = false;
  gamePaused: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['room'] || '';
      if (this.roomCode) {
        this.loadRoom();
      }
    });

    this.socketService.connect();
    this.setupSocketListeners();
  }

  ngAfterViewInit(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initGame();
  }

  loadRoom(): void {
    this.apiService.getRoom(this.roomCode).subscribe({
      next: (room) => {
        this.players = room.players;
        this.initGame();
      },
      error: (err) => {
        console.error('Failed to load room:', err);
      }
    });
  }

  initGame(): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Initialize paddles
    this.paddles.clear();
    this.players.forEach((player, index) => {
      const paddle: Paddle = {
        x: index === 0 ? 50 : canvasWidth - 50,
        y: canvasHeight / 2 - 60,
        width: 15,
        height: 120,
        speed: 0,
        color: player.playerColor,
        playerName: player.playerName
      };
      this.paddles.set(player.socketId, paddle);
      this.score.set(player.socketId, 0);
    });

    // Initialize ball in center
    this.ball.x = canvasWidth / 2;
    this.ball.y = canvasHeight / 2;
    this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 5;
    this.ball.vy = (Math.random() * 2 - 1) * 5;

    if (!this.gameStarted) {
      this.gameLoop();
    }
  }

  setupSocketListeners(): void {
    this.socketService.onPlayerJoined().subscribe((data: any) => {
      this.players = data.players;
      this.initGame();
    });

    this.socketService.onPlayerMotion().subscribe((motion: PlayerMotion) => {
      this.handlePlayerMotion(motion);
    });

    this.socketService.onGameStarted().subscribe(() => {
      this.gameStarted = true;
      this.gamePaused = false;
    });
  }

  handlePlayerMotion(motion: PlayerMotion): void {
    const paddle = this.paddles.get(motion.socketId);
    if (!paddle || !this.canvas) return;

    // Use gamma (left/right tilt) to control paddle
    // Gamma ranges from -90 to 90, map to paddle speed
    const maxTilt = 45;
    const normalizedGamma = Math.max(-maxTilt, Math.min(maxTilt, motion.gamma || 0));
    paddle.speed = (normalizedGamma / maxTilt) * 8;
  }

  update(): void {
    if (!this.gameStarted || this.gamePaused || !this.canvas) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Update paddles
    this.paddles.forEach((paddle) => {
      paddle.y += paddle.speed;
      paddle.y = Math.max(0, Math.min(canvasHeight - paddle.height, paddle.y));
    });

    // Update ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Ball collision with top/bottom walls
    if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= canvasHeight) {
      this.ball.vy = -this.ball.vy;
    }

    // Ball collision with paddles
    this.paddles.forEach((paddle) => {
      if (
        this.ball.x - this.ball.radius <= paddle.x + paddle.width &&
        this.ball.x + this.ball.radius >= paddle.x &&
        this.ball.y - this.ball.radius <= paddle.y + paddle.height &&
        this.ball.y + this.ball.radius >= paddle.y
      ) {
        this.ball.vx = -this.ball.vx;
        // Add spin based on paddle movement
        this.ball.vy += paddle.speed * 0.3;
        this.ball.vx *= 1.05; // Speed up slightly on hit
      }
    });

    // Score points
    if (this.ball.x - this.ball.radius <= 0) {
      // Right player scores
      this.paddles.forEach((paddle, socketId) => {
        if (paddle.x > canvasWidth / 2) {
          const currentScore = this.score.get(socketId) || 0;
          this.score.set(socketId, currentScore + 1);
        }
      });
      this.resetBall();
    } else if (this.ball.x + this.ball.radius >= canvasWidth) {
      // Left player scores
      this.paddles.forEach((paddle, socketId) => {
        if (paddle.x < canvasWidth / 2) {
          const currentScore = this.score.get(socketId) || 0;
          this.score.set(socketId, currentScore + 1);
        }
      });
      this.resetBall();
    }
  }

  resetBall(): void {
    if (!this.canvas) return;
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 5;
    this.ball.vy = (Math.random() * 2 - 1) * 5;
    this.ball.speed = 5;
  }

  draw(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line
    this.ctx.strokeStyle = '#e8ff00';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw paddles
    this.paddles.forEach((paddle) => {
      this.ctx.fillStyle = paddle.color;
      this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      
      // Draw paddle border
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    });

    // Draw ball
    this.ctx.fillStyle = '#e8ff00';
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw scores
    this.ctx.fillStyle = '#e8ff00';
    this.ctx.font = 'bold 48px "Press Start 2P", cursive';
    this.ctx.textAlign = 'center';
    
    let leftScore = 0;
    let rightScore = 0;
    this.paddles.forEach((paddle, socketId) => {
      const score = this.score.get(socketId) || 0;
      if (paddle.x < this.canvas.width / 2) {
        leftScore = score;
      } else {
        rightScore = score;
      }
    });

    this.ctx.fillText(leftScore.toString(), this.canvas.width / 4, 60);
    this.ctx.fillText(rightScore.toString(), (this.canvas.width * 3) / 4, 60);

    // Draw player names
    this.ctx.font = '12px "Press Start 2P", cursive';
    this.ctx.textAlign = 'left';
    this.paddles.forEach((paddle) => {
      const x = paddle.x < this.canvas.width / 2 ? paddle.x : paddle.x + paddle.width + 10;
      this.ctx.fillStyle = paddle.color;
      this.ctx.fillText(paddle.playerName, x, paddle.y - 10);
    });

    // Draw room info overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 80);
    this.ctx.fillStyle = '#e8ff00';
    this.ctx.font = '10px "Press Start 2P", cursive';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Room: ${this.roomCode}`, 20, 30);
    this.ctx.fillText(`Players: ${this.players.length}`, 20, 50);
    this.ctx.fillText(this.gameStarted ? 'GAME ON' : 'WAITING...', 20, 70);
  }

  gameLoop(): void {
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }
}
