import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  games = [
    {
      id: 'air-pong',
      name: 'Air Pong',
      description: 'Tilt phone left/right to move paddle. Classic arcade action.',
      players: '2',
      icon: '🎾'
    },
    {
      id: 'multiplayer-snake',
      name: 'Pixel Snake',
      description: 'Swipe or tilt to change direction. Last snake alive wins!',
      players: '4+',
      icon: '🐍'
    },
    {
      id: 'air-racing',
      name: 'Air Racing',
      description: 'Tilt phone like a steering wheel. High speed racing.',
      players: '1-4',
      icon: '🏎️'
    },
    {
      id: 'space-shooter',
      name: 'Space Shooter',
      description: 'Tilt to move, shake to shoot. Co-op vs waves of enemies.',
      players: '1-4',
      icon: '🚀'
    },
    {
      id: 'air-football',
      name: 'Air Football',
      description: 'Top-down soccer. Tilt to move, jerk phone to kick!',
      players: '2-6',
      icon: '⚽'
    }
  ];

  constructor(private router: Router) { }

  joinRoomPrompt() {
    const code = prompt('ENTER 6-DIGIT ROOM CODE:');
    if (code) {
      this.joinRoom(code);
    }
  }

  joinRoom(code: string) {
    if (code) {
      this.router.navigate(['/lobby'], { queryParams: { room: code.toUpperCase() } });
    }
  }
}
