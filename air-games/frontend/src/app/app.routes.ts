import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Lobby } from './pages/lobby/lobby';
import { Controller } from './pages/controller/controller';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'lobby', component: Lobby },
    { path: 'controller/:roomCode', component: Controller },

    // Lazy-loaded game routes — only downloaded when navigated to
    { path: 'games/air-pong', loadComponent: () => import('./pages/games/air-pong/air-pong').then(m => m.AirPong) },
    { path: 'games/multiplayer-snake', loadComponent: () => import('./pages/games/multiplayer-snake/multiplayer-snake').then(m => m.MultiplayerSnake) },
    { path: 'games/air-racing', loadComponent: () => import('./pages/games/air-racing/air-racing').then(m => m.AirRacing) },
    { path: 'games/air-football', loadComponent: () => import('./pages/games/air-football/air-football').then(m => m.AirFootball) },
    { path: 'games/r-ladder', loadComponent: () => import('./pages/games/r-ladder/r-ladder').then(m => m.RLadder) },

    { path: '**', redirectTo: '' }
];
