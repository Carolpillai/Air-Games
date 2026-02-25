import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'lobby',
    loadComponent: () => import('./pages/lobby/lobby').then(m => m.LobbyComponent)
  },
  {
    path: 'controller',
    loadComponent: () => import('./pages/controller/controller').then(m => m.ControllerComponent)
  },
  {
    path: 'games/air-pong',
    loadComponent: () => import('./pages/games/air-pong/air-pong').then(m => m.AirPongComponent)
  },
  {
    path: 'games/:gameType',
    loadComponent: () => import('./pages/games/air-pong/air-pong').then(m => m.AirPongComponent)
  }
];
