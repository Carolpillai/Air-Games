import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Player } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lobby.html',
  styleUrl: './lobby.css'
})
export class LobbyComponent implements OnInit, OnDestroy {
  gameType: string = 'air-pong';
  playerName: string = '';
  roomCode: string = '';
  qrCode: string = '';
  joinUrl: string = '';
  players: Player[] = [];
  isHost: boolean = false;
  gameStarted: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private apiService: ApiService,
    private socketService: SocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['game']) {
        this.gameType = params['game'];
      }
    });

    // Check if joining existing room
    this.route.queryParams.subscribe(params => {
      if (params['room']) {
        this.roomCode = params['room'];
        this.joinExistingRoom();
      }
    });

    this.socketService.connect();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  createRoom(): void {
    if (!this.playerName.trim()) {
      this.error = 'Please enter your name';
      return;
    }

    this.loading = true;
    this.error = '';

    this.apiService.createRoom({
      gameType: this.gameType,
      playerName: this.playerName.trim()
    }).subscribe({
      next: (response) => {
        this.roomCode = response.roomCode;
        this.qrCode = response.qrCode;
        this.joinUrl = response.joinUrl;
        this.isHost = true;
        this.players = response.room.players;
        this.loading = false;

        // Join socket room as host
        setTimeout(() => {
          this.socketService.joinRoom(this.roomCode, this.playerName, true);
        }, 100); // Small delay to ensure socket is connected
      },
      error: (err) => {
        this.error = 'Failed to create room. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  joinExistingRoom(): void {
    if (!this.roomCode) return;

    this.apiService.getRoom(this.roomCode).subscribe({
      next: (room) => {
        this.gameType = room.gameType;
        this.players = room.players;
        if (!this.playerName) {
          this.playerName = `Player${this.players.length + 1}`;
        }
        this.socketService.joinRoom(this.roomCode, this.playerName, false);
      },
      error: (err) => {
        this.error = 'Room not found';
        console.error(err);
      }
    });
  }

  setupSocketListeners(): void {
    this.socketService.onRoomJoined().subscribe((data: any) => {
      // Update players list when host joins socket room
      if (data.players) {
        this.players = data.players;
      }
    });

    this.socketService.onPlayerJoined().subscribe((data: any) => {
      this.players = data.players;
      console.log('Player joined:', data);
    });

    this.socketService.onPlayerLeft().subscribe((data: any) => {
      this.players = data.players;
      console.log('Player left:', data);
    });

    this.socketService.onGameStarted().subscribe((data: any) => {
      this.gameStarted = true;
      const gameRoute = this.gameType === 'air-pong' ? '/games/air-pong' : `/games/${this.gameType}`;
      this.router.navigate([gameRoute], { queryParams: { room: this.roomCode } });
    });

    this.socketService.onError().subscribe((data: any) => {
      this.error = data.message || 'An error occurred';
      console.error('Socket error:', data);
    });
  }

  startGame(): void {
    if (this.players.length < 2) {
      this.error = 'Need at least 2 players to start';
      return;
    }
    this.socketService.startGame(this.roomCode);
  }

  copyJoinUrl(): void {
    if (this.joinUrl) {
      navigator.clipboard.writeText(this.joinUrl).then(() => {
        // Show temporary feedback
        const btn = event?.target as HTMLElement;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.joinUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('URL copied to clipboard!');
      });
    }
  }

  getMaxPlayers(): number {
    const maxPlayers: { [key: string]: number } = {
      'air-pong': 2,
      'multiplayer-snake': 8,
      'air-racing': 6,
      'space-shooter': 4,
      'air-football': 6
    };
    return maxPlayers[this.gameType] || 4;
  }
}
