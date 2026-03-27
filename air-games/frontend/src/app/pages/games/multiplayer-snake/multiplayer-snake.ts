import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class SnakeScene extends Phaser.Scene {
  private socket!: Socket;
  private roomCode!: string;
  private snakes: { [id: string]: { head: Phaser.GameObjects.Rectangle, body: Phaser.GameObjects.Rectangle[], nameText: Phaser.GameObjects.Text, dir: string, nextDir: string, alive: boolean, name: string } } = {};
  private food!: Phaser.GameObjects.Rectangle;
  private colors = [0xe8ff00, 0x00ff9f, 0xff00ff, 0x00ffff, 0xff8c00, 0xff4455, 0x44ff99, 0xff8844, 0x88aaff, 0xce93d8];

  constructor() {
    super('SnakeScene');
  }

  init(data: { socket: Socket, roomCode: string }) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
  }

  create() {
    this.add.text(400, 20, 'PIXEL SNAKE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#e8ff00'
    }).setOrigin(0.5);

    this.spawnFood();

    this.socket.on('player-motion', (data: any) => {
      if (!this.snakes[data.playerId]) {
        this.createSnake(data.playerId, data.playerName);
      }
      const snake = this.snakes[data.playerId];

      if (data.gamma !== undefined && data.beta !== undefined) {
        if (Math.abs(data.gamma) > Math.abs(data.beta)) {
          if (data.gamma > 20) snake.nextDir = 'RIGHT';
          else if (data.gamma < -20) snake.nextDir = 'LEFT';
        } else {
          if (data.beta > 20) snake.nextDir = 'DOWN';
          else if (data.beta < -20) snake.nextDir = 'UP';
        }
      }
    });

    this.time.addEvent({
      delay: 150,
      callback: this.moveSnakes,
      callbackScope: this,
      loop: true
    });
  }

  createSnake(id: string, name?: string) {
    const color = this.colors[Object.keys(this.snakes).length % this.colors.length];
    const head = this.add.rectangle(400, 300, 20, 20, color);
    const label = name || `P${Object.keys(this.snakes).length + 1}`;

    const nameText = this.add.text(400, 270, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const snake = {
      id,
      head,
      body: [],
      nameText,
      dir: 'RIGHT',
      nextDir: 'RIGHT',
      alive: true,
      name: label
    };
    this.snakes[id] = snake;
    return snake;
  }

  spawnFood() {
    if (this.food) this.food.destroy();
    const x = Phaser.Math.Between(1, 38) * 20;
    const y = Phaser.Math.Between(2, 28) * 20;
    this.food = this.add.rectangle(x, y, 20, 20, 0xff0000);
  }

  moveSnakes() {
    Object.values(this.snakes).forEach((snake: any) => {
      if (!snake.alive) return;

      if (
        (snake.nextDir === 'LEFT' && snake.dir !== 'RIGHT') ||
        (snake.nextDir === 'RIGHT' && snake.dir !== 'LEFT') ||
        (snake.nextDir === 'UP' && snake.dir !== 'DOWN') ||
        (snake.nextDir === 'DOWN' && snake.dir !== 'UP')
      ) {
        snake.dir = snake.nextDir;
      }

      const prevX = snake.head.x;
      const prevY = snake.head.y;

      if (snake.dir === 'LEFT') snake.head.x -= 20;
      else if (snake.dir === 'RIGHT') snake.head.x += 20;
      else if (snake.dir === 'UP') snake.head.y -= 20;
      else if (snake.dir === 'DOWN') snake.head.y += 20;

      if (snake.head.x < 0) snake.head.x = 780;
      if (snake.head.x > 780) snake.head.x = 0;
      if (snake.head.y < 60) snake.head.y = 580;
      if (snake.head.y > 580) snake.head.y = 60;

      snake.nameText.x = snake.head.x;
      snake.nameText.y = snake.head.y - 25;

      const dist = Phaser.Math.Distance.Between(snake.head.x, snake.head.y, this.food.x, this.food.y);
      if (dist < 10) {
        this.spawnFood();
        const part = this.add.rectangle(prevX, prevY, 20, 20, snake.head.fillColor);
        snake.body.push(part);
        
        // WIN CONDITION: Length 10 (Head + 9 body parts)
        if (snake.body.length >= 9) {
          this.add.text(400, 300, `${snake.name} WINS!`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: '#e8ff00'
          }).setOrigin(0.5);
          this.scene.pause();
        }
      } else if (snake.body.length > 0) {
        const lastPart = snake.body.pop();
        lastPart.x = prevX;
        lastPart.y = prevY;
        snake.body.unshift(lastPart);
      }
    });
  }
}

@Component({
  selector: 'app-multiplayer-snake',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multiplayer-snake.html',
  styleUrl: './multiplayer-snake.css'
})
export class MultiplayerSnake implements OnInit, OnDestroy {
  private game: Phaser.Game | null = null;
  private socket: Socket | null = null;
  public roomCode: string = '';
  private backendUrl = `http://${window.location.hostname}:3000`;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['room'] || '';
      if (params['api']) this.backendUrl = params['api'];
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
      scene: SnakeScene
    });
    this.game.scene.start('SnakeScene', { socket: this.socket, roomCode: room });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
    this.socket?.disconnect();
  }
}
