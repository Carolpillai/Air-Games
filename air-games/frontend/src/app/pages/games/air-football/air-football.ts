import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class FootballScene extends Phaser.Scene {
  private socket!: Socket;
  private players: { [id: string]: Phaser.GameObjects.Arc } = {};
  private ball!: Phaser.GameObjects.Arc;
  private goals: { left: Phaser.GameObjects.Rectangle, right: Phaser.GameObjects.Rectangle } = {} as any;
  private scores = { left: 0, right: 0 };
  private scoreText!: Phaser.GameObjects.Text;
  private colors = [0xe8ff00, 0x00ff9f, 0xff00ff, 0x00ffff, 0xff8c00];

  constructor() {
    super('FootballScene');
  }

  init(data: { socket: Socket }) {
    this.socket = data.socket;
  }

  create() {
    const width = 800;
    const height = 600;

    // Pitch
    this.add.rectangle(400, 300, 780, 580, 0x004400).setStrokeStyle(4, 0xffffff);
    this.add.line(400, 300, 0, 10, 0, 570, 0xffffff);
    this.add.circle(400, 300, 60).setStrokeStyle(4, 0xffffff);

    // Goals
    this.goals.left = this.add.rectangle(10, 300, 20, 150, 0xffffff, 0.3);
    this.goals.right = this.add.rectangle(790, 300, 20, 150, 0xffffff, 0.3);
    this.physics.add.existing(this.goals.left, true);
    this.physics.add.existing(this.goals.right, true);

    // Ball
    this.ball = this.add.circle(400, 300, 12, 0xffffff);
    this.physics.add.existing(this.ball);
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    ballBody.setCollideWorldBounds(true);
    ballBody.setBounce(0.8);
    ballBody.setDamping(true);
    ballBody.setDrag(0.98);

    // Score
    this.scoreText = this.add.text(400, 30, '0 - 0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Socket Input
    this.socket.on('player-motion', (data: any) => {
      let player = this.players[data.playerId];
      if (!player) {
        player = this.createPlayer(data.playerId);
      }

      const body = player.body as Phaser.Physics.Arcade.Body;
      if (data.gamma !== undefined && data.beta !== undefined) {
        body.setVelocityX(data.gamma * 10);
        body.setVelocityY(data.beta * 10);
      }

      // Kick logic (shake or jerk)
      if (data.shake) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
        if (dist < 50) {
          const angle = Phaser.Math.Angle.Between(player.x, player.y, this.ball.x, this.ball.y);
          this.physics.velocityFromRotation(angle, 600, ballBody.velocity);
        }
      }
    });

    this.physics.add.collider(this.ball, Object.values(this.players));
  }

  createPlayer(id: string) {
    const color = this.colors[Object.keys(this.players).length % this.colors.length];
    const player = this.add.circle(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500), 20, color);
    this.physics.add.existing(player);
    (player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (player.body as Phaser.Physics.Arcade.Body).setCircle(20);
    this.players[id] = player;

    // Refresh collider with ball
    this.physics.add.collider(this.ball, player);
    return player;
  }

  override update() {
    // Goal detection
    if (this.ball.x < 20 && Math.abs(this.ball.y - 300) < 75) {
      this.scores.right++;
      this.resetPitch();
    } else if (this.ball.x > 780 && Math.abs(this.ball.y - 300) < 75) {
      this.scores.left++;
      this.resetPitch();
    }
    this.scoreText.setText(`${this.scores.left} - ${this.scores.right}`);
  }

  resetPitch() {
    this.ball.setPosition(400, 300);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }
}

@Component({
  selector: 'app-air-football',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './air-football.html',
  styleUrl: './air-football.css'
})
export class AirFootball implements OnInit, OnDestroy {
  private game: Phaser.Game | null = null;
  private socket: Socket | null = null;
  public roomCode: string = '';
  private backendUrl = `http://${window.location.hostname}:3000`;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['room'] || '';
      this.initSocket(this.roomCode);
      this.initPhaser(this.roomCode);
    });
  }

  initSocket(room: string) {
    this.socket = io(this.backendUrl);
    this.socket.emit('join-room', { roomCode: room, type: 'laptop' });
  }

  initPhaser(room: string) {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 800,
      height: 600,
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: FootballScene
    });
    this.game.scene.start('FootballScene', { socket: this.socket });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
    this.socket?.disconnect();
  }
}
