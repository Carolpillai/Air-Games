/** ROAD RASH VERSION 3.0 - REBUILD TO DODGE 10 BIKES **/
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import * as Phaser from 'phaser';

class RacingScene extends Phaser.Scene {
  private socket!: Socket;
  private roomCode!: string;
  private bikes: { [id: string]: { container: Phaser.GameObjects.Container, nameText: Phaser.GameObjects.Text, dodges: number, boost: boolean, stunTime: number } } = {};
  private trackGroup!: Phaser.GameObjects.Group;
  private trafficGroup!: Phaser.Physics.Arcade.Group;
  private colors = [0xe8ff00, 0x00ff9f, 0xff00ff, 0x00ffff, 0xff8c00];
  private gameEnded = false;
  private nextTrafficSpawn = 0;

  constructor() {
    super('RacingScene');
  }

  init(data: { socket: Socket, roomCode: string }) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
  }

  create() {
    // Add a huge title so we know for sure it's working
    this.add.text(400, 200, 'ROAD RASH\nBIKE BATTLE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '36px',
      color: '#e8ff00',
      align: 'center',
      stroke: '#000',
      strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0.12);

    this.socket.on('player-motion', (data: any) => {
      if (!this.bikes[data.playerId]) {
        this.createBike(data.playerId, data.playerName);
      }

      const bike = this.bikes[data.playerId].container;

      if (data.gamma !== undefined) {
        bike.setData('steer', data.gamma / 45);
      }
      if (data.beta !== undefined) {
        bike.setData('accel', Phaser.Math.Clamp(data.beta / 45, 0, 1));
      }
      if (data.action?.type === 'racing-boost') {
        this.bikes[data.playerId].boost = data.action.active;
      }
    });

    this.trackGroup = this.add.group();
    for (let i = 0; i < 15; i++) {
        const line = this.add.rectangle(400, i * 80, 12, 40, 0xffff00);
        this.trackGroup.add(line);
    }

    this.trafficGroup = this.physics.add.group();
    
    // Check overlap for each bike
    this.time.addEvent({
        delay: 50,
        callback: () => {
            Object.values(this.bikes).forEach(b => {
                this.physics.overlap(b.container, this.trafficGroup, (c: any, t: any) => {
                    if (b.stunTime <= 0) {
                        b.stunTime = 1500;
                        b.dodges = Math.max(0, b.dodges - 1);
                        this.cameras.main.flash(100, 255, 0, 0);
                        this.tweens.add({
                            targets: b.container,
                            alpha: 0.2,
                            yoyo: true,
                            duration: 100,
                            repeat: 8
                        });
                    }
                });
            });
        },
        loop: true
    });
  }

  createBike(id: string, name?: string) {
    const color = this.colors[Object.keys(this.bikes).length % this.colors.length];
    
    // Bike Emoji as Player
    const emoji = this.add.text(0, -10, '🏍️', { fontSize: '48px' }).setOrigin(0.5);
    const flare = this.add.text(0, 25, '🔥', { fontSize: '24px' }).setOrigin(0.5).setVisible(false);
    const shadow = this.add.circle(0, 15, 22, color, 0.4);
    
    const container = this.add.container(200 + (Object.keys(this.bikes).length * 100), 500, [shadow, flare, emoji]);
    container.setSize(44, 64);
    this.physics.add.existing(container);
    (container.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    container.setData('steer', 0);
    container.setData('accel', 0);

    const label = name || `P${Object.keys(this.bikes).length + 1}`;
    const nameText = this.add.text(container.x, 440, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.bikes[id] = { container, nameText, dodges: 0, boost: false, stunTime: 0 };
    return container;
  }

  spawnTraffic() {
      const x = Phaser.Math.Between(80, 720);
      const traffic = this.add.text(x, -100, '🏍️', { fontSize: '42px' }).setOrigin(0.5);
      traffic.setTint(0x444444);
      this.physics.add.existing(traffic);
      this.trafficGroup.add(traffic);
      (traffic.body as Phaser.Physics.Arcade.Body).setVelocityY(380);
      traffic.setData('processed-players', new Set());
  }

  override update(time: number, delta: number) {
    if (this.gameEnded) return;

    if (time > this.nextTrafficSpawn) {
        this.spawnTraffic();
        this.nextTrafficSpawn = time + Phaser.Math.Between(700, 1600);
    }

    this.trackGroup.getChildren().forEach((line: any) => {
      line.y += 18;
      if (line.y > 600) line.y = -60;
    });

    this.trafficGroup.getChildren().forEach((t: any) => {
        if (!t.active) return;
        Object.values(this.bikes).forEach(bike => {
            if (bike.stunTime <= 0 && t.y > bike.container.y && !t.getData('processed-players').has(bike)) {
                t.getData('processed-players').add(bike);
                bike.dodges++;
            }
        });
        if (t.y > 750) t.destroy();
    });

    Object.values(this.bikes).forEach((bikeObj: any) => {
      const { container, nameText, boost } = bikeObj;
      if (bikeObj.stunTime > 0) {
          bikeObj.stunTime -= delta;
          (container.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
          return;
      }

      const steer = container.getData('steer');
      const accel = container.getData('accel');
      const body = container.body as Phaser.Physics.Arcade.Body;
      
      const speedMult = boost ? 3.0 : 1.2;
      body.setVelocityX(steer * 480 * speedMult);
      
      const targetY = 510 - (accel * 280);
      container.y = Phaser.Math.Linear(container.y, targetY, 0.12);

      const flare = container.list[1] as Phaser.GameObjects.Text;
      if (boost) {
        flare.setVisible(true);
        flare.setScale(0.8 + Math.random() * 0.5);
      } else {
        flare.setVisible(false);
      }

      nameText.x = container.x;
      nameText.y = container.y - 55;
      nameText.setText(`${nameText.getData('name') || nameText.text.split(':')[0].split(' ')[0]}: ${bikeObj.dodges}/10 DODGED`);

      if (bikeObj.dodges >= 10) {
        this.gameEnded = true;
        this.add.text(400, 300, `${nameText.text.split(':')[0]} WINS!`, {
          fontSize: '48px', color: '#e8ff00', stroke: '#000', strokeThickness: 8,
          fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5);
        this.scene.pause();
      }
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
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: RacingScene
    });
    this.game.scene.start('RacingScene', { socket: this.socket, roomCode: room });
  }

  ngOnDestroy() {
    this.game?.destroy(true);
    this.socket?.disconnect();
  }
}
