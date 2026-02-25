import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Game {
  id: string;
  name: string;
  description: string;
  players: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  games: Game[] = [
    {
      id: 'air-pong',
      name: 'Air Pong',
      description: 'Tilt your phone to control the paddle. Classic pong with motion controls.',
      players: '2 Players',
      icon: '🏓'
    },
    {
      id: 'multiplayer-snake',
      name: 'Multiplayer Snake',
      description: 'Swipe or tilt to change direction. Last snake alive wins!',
      players: '4+ Players',
      icon: '🐍'
    },
    {
      id: 'air-racing',
      name: 'Air Racing',
      description: 'Tilt your phone like a steering wheel. Top-down car racing action.',
      players: 'Up to 6',
      icon: '🏎️'
    },
    {
      id: 'space-shooter',
      name: 'Space Shooter',
      description: 'Tilt to move, shake to shoot. Co-op space battle against waves of enemies.',
      players: '1-4 Players',
      icon: '🚀'
    },
    {
      id: 'air-football',
      name: 'Air Football',
      description: 'Tilt to move, flick to kick. Top-down soccer with motion controls.',
      players: '2v2 or 3v3',
      icon: '⚽'
    }
  ];

  constructor(private router: Router) {}

  navigateToLobby(gameId: string): void {
    this.router.navigate(['/lobby'], { queryParams: { game: gameId } });
  }

  navigateToHowItWorks(): void {
    // Scroll to how it works section or navigate to info page
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
