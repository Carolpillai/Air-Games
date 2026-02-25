import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateRoomRequest {
  gameType: string;
  playerName: string;
}

export interface CreateRoomResponse {
  roomCode: string;
  qrCode: string;
  joinUrl: string;
  room: any;
}

export interface Room {
  roomCode: string;
  gameType: string;
  players: Player[];
  maxPlayers: number;
  gameState: string;
}

export interface Player {
  socketId: string;
  playerName: string;
  playerColor: string;
  isHost: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  createRoom(request: CreateRoomRequest): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(`${this.apiUrl}/rooms`, request);
  }

  getRoom(roomCode: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/rooms/${roomCode}`);
  }
}
