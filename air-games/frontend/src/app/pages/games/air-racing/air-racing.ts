import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class RacingScene extends Phaser.Scene {
  private socket!: Socket;
  private roomCode!: string;
  private cars: { [id: string]: { rect: Phaser.GameObjects.Rectangle, nameText: Phaser.GameObjects.Text } } = {};
  private trackGroup!: Phaser.GameObjects.Group;
  private colors = [0xe8ff00, 0x00ff9f, 0xff00ff, 0x00ffff, 0xff8c00];

  constructor() {
    super('RacingScene');
  }

  init(data: { socket: Socket, roomCode: string }) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
  }

  create() {
    this.add.text(400, 300, 'AIR RACING', {
      fontFamily: '"Press Start 2P"',
      fontSize: '24px',
      color: 'rgba(255,255,255,0.1)'
    }).setOrigin(0.5);

    this.socket.on('player-motion', (data: any) => {
      if (!this.cars[data.playerId]) {
        this.createCar(data.playerId, data.playerName);
      }

      const car = this.cars[data.playerId].rect;

      if (data.gamma !== undefined) {
        // gamma steer
        car.setData('steer', data.gamma / 45);
      }
      if (data.beta !== undefined) {
        // beta accelerate (forward tilt)
        car.setData('accel', Phaser.Math.Clamp(data.beta / 45, 0, 1));
      }
    });

    // Create a simple scrolling track effect
    this.trackGroup = this.add.group();
    for (let i = 0; i < 10; i++) {
      const line = this.add.rectangle(400, i * 100, 10, 50, 0xffffff);
      this.trackGroup.add(line);
    }
  }

  createCar(id: string, name?: string) {
    const color = this.colors[Object.keys(this.cars).length % this.colors.length];
    const rect = this.add.rectangle(400, 500, 30, 50, color);
    this.physics.add.existing(rect);
    (rect.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    rect.setData('steer', 0);
    rect.setData('accel', 0);

    const label = name || `P${Object.keys(this.cars).length + 1}`;
    const nameText = this.add.text(400, 460, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.cars[id] = { rect, nameText };
    return rect;
  }

  override update() {
    // Scroll track
    this.trackGroup.getChildren().forEach((line: any) => {
      line.y += 5;
      if (line.y > 600) line.y = -50;
    });

    Object.values(this.cars).forEach((carObj: any) => {
      const { rect, nameText } = carObj;
      const steer = rect.getData('steer');
      const accel = rect.getData('accel');

      const body = rect.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(steer * 300);
      rect.y = Phaser.Math.Linear(rect.y, 500 - (accel * 100), 0.1);

      // Update label position
      nameText.x = rect.x;
      nameText.y = rect.y - 40;
    });
  }
}

@Component({
  selector: 'app-air-racing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './air-racing.html',
  styleUrl: './air-racing.css'
})
export class AirRacing implements OnInit, OnDestroy {
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
      physics: { default: 'arcade' },
      scene: RacingScene
    });
    this.game.scene.start('RacingScene', { socket: this.socket, roomCode: room });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
    this.socket?.disconnect();
  }
}
