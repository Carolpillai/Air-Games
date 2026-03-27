import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class PongScene extends Phaser.Scene {
  private socket!: Socket;
  private roomCode!: string;
  private paddleL!: Phaser.GameObjects.Rectangle;
  private paddleR!: Phaser.GameObjects.Rectangle;
  private ball!: Phaser.GameObjects.Arc;
  private scoreL: number = 0;
  private scoreR: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;
  private players: { [key: string]: { side: 'L' | 'R', name: string, nameText: Phaser.GameObjects.Text } } = {};
  private gameEnded: boolean = false;

  // Smooth paddle movement — store desired Y target
  private paddleTargetL: number = 300;
  private paddleTargetR: number = 300;
  private readonly LERP_SPEED = 0.07; // lower = slower/heavier paddle feel

  // Ball speed constant — enforced every frame to prevent physics drift
  private readonly BALL_SPEED = 380;

  constructor() {
    super('PongScene');
  }

  init(data: { socket: Socket, roomCode: string }) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.paddleTargetL = height / 2;
    this.paddleTargetR = height / 2;

    // Paddles
    this.paddleL = this.add.rectangle(30, height / 2, 20, 100, 0xe8ff00);
    this.paddleR = this.add.rectangle(width - 30, height / 2, 20, 100, 0x00ff9f);

    this.physics.add.existing(this.paddleL);
    this.physics.add.existing(this.paddleR);

    const bodyL = this.paddleL.body as Phaser.Physics.Arcade.Body;
    const bodyR = this.paddleR.body as Phaser.Physics.Arcade.Body;

    bodyL.setImmovable(true);
    bodyR.setImmovable(true);
    bodyL.setCollideWorldBounds(true);
    bodyR.setCollideWorldBounds(true);

    // Ball
    this.ball = this.add.circle(width / 2, height / 2, 10, 0xffffff);
    this.physics.add.existing(this.ball);
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.setBounce(1, 1);
    ballBody.setCollideWorldBounds(true);
    // Start at a 45° angle so it never goes perfectly horizontal
    const dir = Math.random() > 0.5 ? 1 : -1;
    const vx = dir * this.BALL_SPEED * Math.cos(Math.PI / 4);
    const vy = (Math.random() > 0.5 ? 1 : -1) * this.BALL_SPEED * Math.sin(Math.PI / 4);
    ballBody.setVelocity(vx, vy);
    ballBody.setMaxVelocity(this.BALL_SPEED * 1.5, this.BALL_SPEED * 1.5);

    // Collisions
    this.physics.add.collider(this.ball, this.paddleL);
    this.physics.add.collider(this.ball, this.paddleR);

    // Score
    this.scoreText = this.add.text(width / 2, 50, '0 - 0', {
      fontSize: '32px',
      fontFamily: '"Press Start 2P"',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Winner Text (hidden initially)
    this.winText = this.add.text(width / 2, height / 2, '', {
      fontSize: '52px',
      fontFamily: '"Press Start 2P"',
      color: '#ffcc00', // Yellow base
      align: 'center',
      stroke: '#ff6600', // Orange stroke
      strokeThickness: 12,
      shadow: { color: '#000000', fill: true, offsetX: 8, offsetY: 8, blur: 0 }
    }).setOrigin(0.5).setVisible(false).setDepth(100);

    // Socket Input — only update the TARGET position; actual movement happens in update()
    this.socket.on('player-motion', (data: any) => {
      if (this.gameEnded) return;

      if (!this.players[data.playerId]) {
        const side = Object.keys(this.players).length === 0 ? 'L' : 'R';
        const name = data.playerName || (side === 'L' ? 'PLAYER 1' : 'PLAYER 2');

        const textX = side === 'L' ? 30 : width - 30;
        const nameText = this.add.text(textX, 50, name, {
          fontSize: '12px',
          fontFamily: '"Press Start 2P"',
          color: side === 'L' ? '#e8ff00' : '#00ff9f'
        }).setOrigin(side === 'L' ? 0 : 1, 0.5);

        this.players[data.playerId] = { side, name, nameText };
      }

      const player = this.players[data.playerId];

      // Map tilt to a target Y across the full canvas height (60–540 to keep paddle on screen)
      let tilt = 0;
      if (data.isTouch || data.isDpad) {
        // Touch/D-pad: beta is already –45..+45 relative
        tilt = data.beta;
      } else {
        // Gyro: beta 0° = phone flat, ~90° = upright; centre at 45°
        tilt = data.beta - 45;
      }

      // tilt range is roughly –45 to +45; map to canvas Y (60 top margin, 540 bottom margin)
      const targetY = Phaser.Math.Clamp(
        height / 2 + tilt * ((height / 2 - 60) / 45),
        60, height - 60
      );

      if (player.side === 'L') {
        this.paddleTargetL = targetY;
      } else {
        this.paddleTargetR = targetY;
      }
    });
  }

  override update(_time: number, delta: number) {
    if (this.gameEnded) return;

    // --- Smooth paddle movement every frame ---
    // Normalize lerp speed to frame delta so it feels the same at any FPS
    const t = 1 - Math.pow(1 - this.LERP_SPEED, delta / 16.67);
    const height = this.cameras.main.height;
    const margin = 50; // half paddle height

    this.paddleL.y = Phaser.Math.Linear(
      this.paddleL.y,
      Phaser.Math.Clamp(this.paddleTargetL, margin, height - margin),
      t
    );
    this.paddleR.y = Phaser.Math.Linear(
      this.paddleR.y,
      Phaser.Math.Clamp(this.paddleTargetR, margin, height - margin),
      t
    );

    // Sync paddle physics bodies WITHOUT calling reset()/stop() — just move the body rectangle
    const bodyL = this.paddleL.body as Phaser.Physics.Arcade.Body;
    const bodyR = this.paddleR.body as Phaser.Physics.Arcade.Body;
    bodyL.position.set(this.paddleL.x - bodyL.halfWidth, this.paddleL.y - bodyL.halfHeight);
    bodyR.position.set(this.paddleR.x - bodyR.halfWidth, this.paddleR.y - bodyR.halfHeight);

    // --- Ball speed enforcement: keep constant speed to prevent arcade physics drift ---
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    const spd = Math.sqrt(ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2);
    if (spd > 1) {
      const scale = this.BALL_SPEED / spd;
      ballBody.setVelocity(ballBody.velocity.x * scale, ballBody.velocity.y * scale);
    }

    // Update player name text to follow paddle
    for (const id in this.players) {
      const p = this.players[id];
      const paddle = p.side === 'L' ? this.paddleL : this.paddleR;
      p.nameText.y = paddle.y - 70;
    }

    // --- Scoring ---
    if (this.ball.x < 15) {
      this.scoreR++;
      this.resetBall();
    } else if (this.ball.x > 785) {
      this.scoreL++;
      this.resetBall();
    }
    this.scoreText.setText(`${this.scoreL} - ${this.scoreR}`);

    // Check for winner
    if (this.scoreL >= 10 || this.scoreR >= 10) {
      this.endGame();
    }
  }

  endGame() {
    this.gameEnded = true;
    const winnerSide = this.scoreL >= 10 ? 'L' : 'R';
    let winnerName = 'PLAYER';

    // Find name from players map
    for (const id in this.players) {
      if (this.players[id].side === winnerSide) {
        winnerName = this.players[id].name;
        break;
      }
    }

    this.winText.setText(`${winnerName.toUpperCase()}\nWINS!`).setVisible(true);

    // Add sparkle effect
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(100, 700);
      const y = Phaser.Math.Between(100, 500);
      const star = this.add.text(x, y, '✦', { fontSize: '24px', color: '#ffffff' });
      this.tweens.add({
        targets: star,
        alpha: 0,
        scale: 2,
        duration: 1000 + (i * 100),
        repeat: -1,
        yoyo: true
      });
    }

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.setVelocity(0, 0);
    this.ball.setVisible(false);
  }

  resetBall() {
    this.ball.setPosition(400, 300);
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.reset(400, 300);
    // Fire at a random diagonal angle — never purely horizontal or vertical
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180); // -30° to +30°
    const dir = Math.random() > 0.5 ? 1 : -1;
    const vx = dir * this.BALL_SPEED * Math.cos(angle);
    const vy = (Math.random() > 0.5 ? 1 : -1) * this.BALL_SPEED * Math.sin(angle);
    ballBody.setVelocity(vx, vy);
  }
}

@Component({
  selector: 'app-air-pong',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './air-pong.html',
  styleUrl: './air-pong.css'
})
export class AirPong implements OnInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  private game: Phaser.Game | null = null;
  private socket: Socket | null = null;
  public roomCode: string = '';
  private backendUrl = `http://${window.location.hostname}:3000`;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['room'] || '';
      if (params['api']) {
        this.backendUrl = params['api'];
      }
      this.initSocket();
      this.initPhaser();
    });
  }

  initSocket() {
    this.socket = io(this.backendUrl);
    this.socket.emit('join-room', { roomCode: this.roomCode, type: 'laptop' });
  }

  initPhaser() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 800,
      height: 600,
      roundPixels: true,     // prevents sub-pixel jitter on object edges
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          fps: 120            // 2× physics steps per frame = smoother collisions
        }
      },
      scene: PongScene
    };

    this.game = new Phaser.Game(config);
    this.game.scene.start('PongScene', { socket: this.socket, roomCode: this.roomCode });
  }

  ngOnDestroy() {
    if (this.game) {
      this.game.destroy(true);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
