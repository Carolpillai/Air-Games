import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class ShooterScene extends Phaser.Scene {
  private socket!: Socket;
  private ships: { [id: string]: Phaser.GameObjects.Triangle } = {};
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('ShooterScene');
  }

  init(data: { socket: Socket }) {
    this.socket = data.socket;
  }

  create() {
    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.socket.on('player-motion', (data: any) => {
      let ship = this.ships[data.playerId];
      if (!ship) {
        ship = this.createShip(data.playerId);
      }

      if (data.gamma !== undefined && data.beta !== undefined) {
        // gamma/beta for positioning
        const targetX = Phaser.Math.Clamp(400 + data.gamma * 10, 50, 750);
        const targetY = Phaser.Math.Clamp(300 + data.beta * 10, 50, 550);
        ship.x = Phaser.Math.Linear(ship.x, targetX, 0.2);
        ship.y = Phaser.Math.Linear(ship.y, targetY, 0.2);
      }

      if (data.shake) {
        this.fireBullet(ship);
      }
    });

    // Spawn enemies
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      b.destroy();
      e.destroy();
    });
  }

  createShip(id: string) {
    const ship = this.add.triangle(400, 500, 0, 40, 20, 0, 40, 40, 0x00ffff);
    this.physics.add.existing(ship);
    this.ships[id] = ship;
    return ship;
  }

  spawnEnemy() {
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.add.rectangle(x, -50, 30, 30, 0xff0000);
    this.enemies.add(enemy);
    (enemy.body as Phaser.Physics.Arcade.Body).setVelocityY(100);
  }

  fireBullet(ship: Phaser.GameObjects.Triangle) {
    const bullet = this.add.rectangle(ship.x, ship.y - 30, 5, 10, 0xe8ff00);
    this.bullets.add(bullet);
    (bullet.body as Phaser.Physics.Arcade.Body).setVelocityY(-400);
  }

  override update() {
    this.enemies.getChildren().forEach((e: any) => {
      if (e.y > 650) e.destroy();
    });
    this.bullets.getChildren().forEach((b: any) => {
      if (b.y < -50) b.destroy();
    });
  }
}

@Component({
  selector: 'app-space-shooter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-shooter.html',
  styleUrl: './space-shooter.css'
})
export class SpaceShooter implements OnInit, OnDestroy {
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
      scene: ShooterScene
    });
    this.game.scene.start('ShooterScene', { socket: this.socket });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
    this.socket?.disconnect();
  }
}
