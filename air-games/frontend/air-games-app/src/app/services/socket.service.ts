import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export interface MotionData {
  beta: number;
  gamma: number;
  alpha: number;
  shake: boolean;
  acceleration?: { x: number; y: number; z: number };
}

export interface PlayerMotion {
  socketId: string;
  playerName: string;
  playerColor: string;
  beta: number;
  gamma: number;
  alpha: number;
  shake: boolean;
  acceleration?: { x: number; y: number; z: number };
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private socketUrl = 'http://localhost:3000';

  connect(): void {
    if (!this.socket) {
      this.socket = io(this.socketUrl);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomCode: string, playerName: string, isHost: boolean): void {
    if (this.socket) {
      this.socket.emit('join-room', { roomCode, playerName, isHost });
    }
  }

  sendMotionData(roomCode: string, motionData: MotionData): void {
    if (this.socket) {
      this.socket.emit('motion-data', { roomCode, ...motionData });
    }
  }

  startGame(roomCode: string): void {
    if (this.socket) {
      this.socket.emit('start-game', { roomCode });
    }
  }

  sendGameState(roomCode: string, gameState: any): void {
    if (this.socket) {
      this.socket.emit('game-state', { roomCode, gameState });
    }
  }

  onRoomJoined(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('room-joined', (data) => observer.next(data));
      }
    });
  }

  onPlayerJoined(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('player-joined', (data) => observer.next(data));
      }
    });
  }

  onPlayerLeft(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('player-left', (data) => observer.next(data));
      }
    });
  }

  onPlayerMotion(): Observable<PlayerMotion> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('player-motion', (data) => observer.next(data));
      }
    });
  }

  onGameStarted(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('game-started', (data) => observer.next(data));
      }
    });
  }

  onGameStateUpdate(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('game-state-update', (data) => observer.next(data));
      }
    });
  }

  onError(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('error', (data) => observer.next(data));
      }
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}
