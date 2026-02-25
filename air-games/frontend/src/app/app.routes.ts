import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Lobby } from './pages/lobby/lobby';
import { Controller } from './pages/controller/controller';
import { AirPong } from './pages/games/air-pong/air-pong';
import { MultiplayerSnake } from './pages/games/multiplayer-snake/multiplayer-snake';
import { AirRacing } from './pages/games/air-racing/air-racing';
import { SpaceShooter } from './pages/games/space-shooter/space-shooter';
import { AirFootball } from './pages/games/air-football/air-football';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'lobby', component: Lobby },
    { path: 'controller/:roomCode', component: Controller },
    { path: 'games/air-pong', component: AirPong },
    { path: 'games/multiplayer-snake', component: MultiplayerSnake },
    { path: 'games/air-racing', component: AirRacing },
    { path: 'games/space-shooter', component: SpaceShooter },
    { path: 'games/air-football', component: AirFootball },
    { path: '**', redirectTo: '' }
];
