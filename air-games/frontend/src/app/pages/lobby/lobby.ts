import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lobby.html',
  styleUrl: './lobby.css'
})
export class Lobby implements OnInit, OnDestroy {
  roomCode: string = '';
  qrCode: string = '';
  players: any[] = [];
  selectedGameId: string | null = null;
  isGamePinned: boolean = false;

  games = [
    { id: 'air-pong', name: 'AIR PONG', icon: '🏓', players: '1-2', description: 'CLASSIC ARCADE ACTION REIMAGINED.' },
    { id: 'air-racing', name: 'BIKE RUSH', icon: '🏍️', players: '2-5', description: 'ROAD RASH STYLE! DODGE 10 BIKES TO WIN!' },
    { id: 'multiplayer-snake', name: 'PIXEL SNAKE', icon: '🐍', players: '1-10', description: 'CO-OP OR COMPETITIVE SLITHERING.' },
    { id: 'r-ladder', name: 'COMPUTER LADDER', icon: '🪜', players: '2-4', description: 'CLASSIC CS EDITION. CLIMB WITH KNOWLEDGE!' },
    { id: 'air-football', name: 'AIR FOOTBALL', icon: '⚽', players: '2-6', description: 'TOP-DOWN SOCCER. TILT TO MOVE, JERK PHONE TO KICK!' },
  ];

  private socket: Socket | null = null;
  private backendUrl = `http://${window.location.hostname}:3000`;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Allow overriding backend URL via ?api=https://...
    this.route.queryParams.subscribe(params => {
      if (params['api']) {
        this.backendUrl = params['api'];
      }
    });
  }

  private roomCreated: boolean = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['game']) {
        this.selectedGameId = params['game'];
        this.isGamePinned = true;
      }

      const existingRoom = params['room'];
      if (existingRoom) {
        this.joinExistingRoom(existingRoom);
      } else if (!this.roomCreated) {
        this.roomCreated = true;
        this.createRoom();
      }
    });

    // Forced update to clear any "ghost" states
    setTimeout(() => this.cdr.detectChanges(), 1000);
  }

  createRoom() {
    const baseUrl = window.location.origin;
    const body: any = { baseUrl };
    if (this.backendUrl.includes('loca.lt') || this.backendUrl.includes('ngrok')) {
      body.apiTunnel = this.backendUrl;
    }

    console.log('Sending room creation request to:', `${this.backendUrl}/api/rooms`, body);

    this.http.post<any>(`${this.backendUrl}/api/rooms`, body).subscribe({
      next: (res) => {
        console.log('Room created successfully:', res.roomCode);
        this.roomCode = res.roomCode;
        this.qrCode = res.qrCode;
        this.initSocket();
        this.cdr.detectChanges(); // Brute force UI update
      },
      error: (err) => {
        console.error('Failed to create room:', err);
        this.roomCode = 'ERROR';
        this.cdr.detectChanges();
      }
    });
  }

  joinExistingRoom(code: string) {
    this.http.get<any>(`${this.backendUrl}/api/rooms/${code}`).subscribe({
      next: (res) => {
        this.roomCode = res.code || res.roomCode;
        this.qrCode = res.qrCode;
        this.initSocket();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to join existing room', err);
        this.createRoom(); // Fallback to new room
      }
    });
  }

  initSocket() {
    console.log('Initializing socket to:', this.backendUrl);
    this.socket = io(this.backendUrl);

    this.socket.on('connect', () => {
      console.log('Socket connected! Joining room:', this.roomCode);
      this.socket?.emit('join-room', { roomCode: this.roomCode, type: 'laptop' });
    });

    this.socket.on('room-info', (data) => {
      console.log('Received room info:', data);
      this.roomCode = data.roomCode;
      this.players = data.players || [];
      this.cdr.detectChanges();
    });

    this.socket.on('player-joined', (player) => {
      console.log('New player joined:', player);
      // Check for duplicates
      if (!this.players.find(p => p.id === player.id)) {
        this.players.push(player);
      }
      this.cdr.detectChanges();
    });

    this.socket.on('player-left', (playerId) => {
      this.players = this.players.filter(p => p.id !== playerId);
      this.cdr.detectChanges();
    });

    this.socket.on('game-started', (data: { roomCode: string; gameId: string }) => {
      if (!data || data.roomCode !== this.roomCode) return;

      const queryParams: any = { room: this.roomCode };
      if (this.backendUrl.includes('loca.lt') || this.backendUrl.includes('ngrok')) {
        queryParams.api = this.backendUrl;
      }

      this.router.navigate([`/games/${data.gameId}`], { queryParams });
    });
  }

  selectGame(gameId: string) {
    this.selectedGameId = gameId;
    this.isGamePinned = true;
    this.cdr.detectChanges();
  }

  getRequiredPlayers(): number {
    if (!this.selectedGameId) return 1;
    const game = this.games.find(g => g.id === this.selectedGameId);
    if (!game) return 1;
    const parts = game.players.split('-');
    // Prioritize the minimum player count (first number in the range)
    const min = parseInt(parts[0]);
    return isNaN(min) ? 1 : min;
  }

  startGame() {
    if (this.socket && this.selectedGameId) {
      if (this.players.length < this.getRequiredPlayers()) {
        alert(`NEED ${this.getRequiredPlayers()} PLAYERS TO START THIS GAME!`);
        return;
      }
      this.socket.emit('start-game', { roomCode: this.roomCode, gameId: this.selectedGameId });
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
