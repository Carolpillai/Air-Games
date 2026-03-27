import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { FlattenPipe } from './flatten.pipe';

interface Question {
    text: string;
    options: string[];
    correct: number;
}

interface SpecialSquare {
    type: 'ladder' | 'mega-ladder' | 'snake' | 'power-up';
    destination?: number;
    question?: Question;
    powerUpType?: PowerUpType;
    label?: string;
}

type PowerUpType = 'HINT_TOKEN' | 'SKIP_SNAKE' | 'DOUBLE_CLIMB' | 'STEAL';

interface PowerUp {
    type: PowerUpType;
    name: string;
    icon: string;
    description: string;
}

interface Player {
    id: number;
    socketId: string;
    name: string;
    color: string;
    position: number;
    powerUps: PowerUp[];
    skipSnakeActive: boolean;
    doubleClimbActive: boolean;
}

const PLAYER_COLORS = ['#FFE000', '#FF4455', '#44FF99', '#FF8844'];

const POWER_UP_DEFS: Record<PowerUpType, PowerUp> = {
    HINT_TOKEN: { type: 'HINT_TOKEN', name: 'HINT TOKEN', icon: '💡', description: 'Reveals one wrong answer' },
    SKIP_SNAKE: { type: 'SKIP_SNAKE', name: 'SKIP SNAKE', icon: '🛡️', description: 'Immunity to next snake' },
    DOUBLE_CLIMB: { type: 'DOUBLE_CLIMB', name: 'DOUBLE CLIMB', icon: '⬆️', description: 'Correct = climb double far' },
    STEAL: { type: 'STEAL', name: 'STEAL', icon: '🃏', description: "Steal another player's power up" },
};

const EASY_QUESTIONS: Question[] = [
    { text: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit'], correct: 0 },
    { text: 'Which of these is the "brains" of the computer?', options: ['Hard Drive', 'Monitor', 'CPU'], correct: 2 },
    { text: 'Which of these is an INPUT device?', options: ['Printer', 'Speaker', 'Mouse'], correct: 2 },
    { text: 'What is the full form of RAM?', options: ['Read Access Memory', 'Random Access Memory', 'Ready Active Memory'], correct: 1 },
    { text: 'Which of these is a programming language?', options: ['Python', 'HTML', 'Excel'], correct: 0 },
    { text: 'What is the most common language used for building structure of Web pages?', options: ['Java', 'HTML', 'Python'], correct: 1 },
    { text: 'What does URL stand for?', options: ['Universal Resource Locator', 'Uniform Resource Locator', 'Unified Road Locator'], correct: 1 },
    { text: 'Which company developed Windows?', options: ['Apple', 'Microsoft', 'IBM'], correct: 1 },
    { text: 'What is the purpose of a Firewall?', options: ['Speed up internet', 'Security', 'Store files'], correct: 1 },
    { text: 'Which of these is a web browser?', options: ['Chrome', 'Word', 'Zoom'], correct: 0 },
    { text: 'What is the smallest unit of digital info?', options: ['Byte', 'Bit', 'Kilo'], correct: 1 },
    { text: 'What does WWW stand for?', options: ['World Wide Web', 'World Whole Web', 'Wide World Window'], correct: 0 },
];

const BOARD_SPECIAL: Record<number, SpecialSquare> = {
    // Ladders (Blue) - EXTENDED
    4: { type: 'ladder', destination: 24, label: 'MEGA CLIMB', question: EASY_QUESTIONS[0] },
    9: { type: 'ladder', destination: 29, label: 'STAIRS UP!', question: EASY_QUESTIONS[1] },
    21: { type: 'ladder', destination: 61, label: 'DATA LIFT', question: EASY_QUESTIONS[2] },
    28: { type: 'ladder', destination: 88, label: 'CLOUD ASCEND!', question: EASY_QUESTIONS[3] },
    33: { type: 'ladder', destination: 53, label: 'LOGIC JUMP', question: EASY_QUESTIONS[4] },
    36: { type: 'ladder', destination: 76, label: 'SERVER BOOST', question: EASY_QUESTIONS[5] },
    51: { type: 'ladder', destination: 91, label: 'WI-FI UP!', question: EASY_QUESTIONS[6] },
    71: { type: 'ladder', destination: 97, label: 'SYSTEM UPGRADE', question: EASY_QUESTIONS[7] },
    2: { type: 'ladder', destination: 22, label: 'FAST TRACK', question: EASY_QUESTIONS[8] },

    // Snakes (Green) - EXTENDED
    10: { type: 'snake', destination: 1, label: 'SYSTEM CRASH', question: EASY_QUESTIONS[11] },
    24: { type: 'snake', destination: 5, label: 'BUFFER UNDERFLOW', question: EASY_QUESTIONS[0] },
    19: { type: 'snake', destination: 2, label: 'LATENCY DROP', question: EASY_QUESTIONS[1] },
    46: { type: 'snake', destination: 5, label: 'POWER OUTAGE', question: EASY_QUESTIONS[2] },
    54: { type: 'snake', destination: 34, label: 'PACKET LOSS', question: EASY_QUESTIONS[10] },
    62: { type: 'snake', destination: 12, label: 'MALWARE ATTACK', question: EASY_QUESTIONS[3] },
    81: { type: 'snake', destination: 24, label: 'DDOS WARNING', question: EASY_QUESTIONS[4] },
    89: { type: 'snake', destination: 39, label: 'BUG DETECTED', question: EASY_QUESTIONS[5] },
    92: { type: 'snake', destination: 52, label: 'UPTIME DROP', question: EASY_QUESTIONS[6] },
    95: { type: 'snake', destination: 44, label: 'FIREWALL BLOCK', question: EASY_QUESTIONS[7] },
    98: { type: 'snake', destination: 40, label: 'ACCESS DENIED', question: EASY_QUESTIONS[8] },
    99: { type: 'snake', destination: 50, label: 'KERNEL PANIC', question: EASY_QUESTIONS[9] },

    // Power-ups
    15: { type: 'power-up', powerUpType: 'HINT_TOKEN' },
    35: { type: 'power-up', powerUpType: 'SKIP_SNAKE' },
    50: { type: 'power-up', powerUpType: 'DOUBLE_CLIMB' },
    70: { type: 'power-up', powerUpType: 'STEAL' },
};

@Component({
    selector: 'app-r-ladder',
    standalone: true,
    imports: [CommonModule, NgSwitch, NgSwitchCase, FlattenPipe],
    templateUrl: './r-ladder.html',
    styleUrl: './r-ladder.css',
})
export class RLadder implements OnInit, OnDestroy {

    // ── Socket / room ──────────────────────────────────────────────────────────
    private socket: Socket | null = null;
    private backendUrl = `https://air-games.onrender.com`;
    roomCode = '';
    qrCodeUrl = '';
    gamePhase: 'waiting' | 'playing' | 'question' | 'result' | 'powerup-anim' | 'won' = 'waiting';

    // ── Players ────────────────────────────────────────────────────────────────
    players: Player[] = [];
    currentPlayerIdx = 0;
    board: number[][] = [];

    // ── Dice ──────────────────────────────────────────────────────────────────
    diceValue = 1;
    diceRolling = false;
    diceRolled = false;

    // ── Movement ───────────────────────────────────────────────────────────────
    movingPlayerId: number | null = null;
    moving = false;

    // ── Question ───────────────────────────────────────────────────────────────
    currentQuestion: Question | null = null;
    currentSpecial: SpecialSquare | null = null;
    selectedAnswer: number | null = null;
    answerResult: 'correct' | 'wrong' | null = null;
    hintUsed = false;
    hintEliminated: number[] = [];
    timerMax = 5;
    timerLeft = 5;
    timerPct = 100;
    private timerInterval: any;

    // ── Result ─────────────────────────────────────────────────────────────────
    resultMessage = '';
    resultType: 'climb' | 'fall' | 'escape' | 'swallowed' | '' = '';

    // ── Power-up ──────────────────────────────────────────────────────────────
    activePowerUp: PowerUp | null = null;
    showSteal = false;

    // ── Win ───────────────────────────────────────────────────────────────────
    winner: Player | null = null;
    confetti: { char: string; x: number; y: number; delay: number; color: string }[] = [];

    private rollInterval: any;

    constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        this.board = this.generateBoard();
        this.route.queryParams.subscribe(params => {
            this.roomCode = params['room'] || '';
            if (params['api']) this.backendUrl = params['api'];
            if (this.roomCode) this.initSocket();
        });
    }

    ngOnDestroy() {
        clearInterval(this.timerInterval);
        clearInterval(this.rollInterval);
        this.socket?.disconnect();
    }

    // ── Board ──────────────────────────────────────────────────────────────────
    generateBoard(): number[][] {
        const rows: number[][] = [];
        for (let r = 0; r < 10; r++) {
            const rfb = 9 - r;
            const start = rfb * 10 + 1;
            const row: number[] = [];
            for (let c = 0; c < 10; c++) row.push(rfb % 2 === 0 ? start + c : start + 9 - c);
            rows.push(row);
        }
        return rows;
    }

    getSpecial(n: number): SpecialSquare | undefined { return BOARD_SPECIAL[n]; }
    isLadder(n: number) { const s = this.getSpecial(n); return s?.type === 'ladder' || s?.type === 'mega-ladder'; }
    isSnake(n: number) { return this.getSpecial(n)?.type === 'snake'; }
    isMega(n: number) { return this.getSpecial(n)?.type === 'mega-ladder'; }
    isPowerUp(n: number) { return this.getSpecial(n)?.type === 'power-up'; }

    squareCellClass(n: number) {
        const base = n % 2 === 0 ? 'sq-even' : 'sq-odd';
        const s = this.getSpecial(n);
        if (!s) return base;
        if (s.type === 'mega-ladder') return base + ' sq-mega';
        if (s.type === 'ladder') return base + ' sq-ladder';
        if (s.type === 'snake') return base + ' sq-snake';
        if (s.type === 'power-up') return base + ' sq-powerup';
        return base;
    }

    get currentPlayer(): Player { return this.players[this.currentPlayerIdx]; }
    get otherPlayers(): Player[] { return this.players.filter((_, i) => i !== this.currentPlayerIdx); }
    playersOnSquare(n: number): Player[] { return this.players.filter(p => p.position === n); }

    // ── Socket ─────────────────────────────────────────────────────────────────
    initSocket() {
        this.socket = io(this.backendUrl);
        this.socket.emit('join-room', { roomCode: this.roomCode, type: 'laptop' });

        this.socket.on('room-info', (data: any) => {
            if (this.gamePhase !== 'waiting') return;
            for (const p of (data.players || [])) {
                this.addPlayer(p);
            }
        });

        this.socket.on('player-joined', (player: any) => {
            if (this.gamePhase !== 'waiting') return;
            this.addPlayer(player);
        });

        this.socket.on('player-left', (playerId: string) => {
            if (this.gamePhase !== 'waiting') return;
            this.players = this.players.filter(p => p.socketId !== playerId);
        });

        this.socket.on('game-started', () => {
            if (this.players.length >= 2) this.beginGame();
        });

        this.socket.on('player-motion', (d: any) => {
            if (this.gamePhase === 'waiting' || !this.socket) return;
            const p = this.players.find(x => x.socketId === d.playerId);
            if (!p || p.id !== this.currentPlayerIdx) return;

            if (d.action?.type === 'rl-roll') {
                this.rollDice();
            }
            if (d.action?.type === 'rl-answer') {
                this.handleAnswer(d.action.idx);
            }
            if (d.action?.type === 'rl-use-hint') {
                this.useHint();
            }
        });
    }

    addPlayer(raw: any) {
        if (this.players.find(p => p.socketId === raw.id)) return;
        if (this.players.length >= 4) return;
        const idx = this.players.length;
        this.players.push({
            id: idx,
            socketId: raw.id,
            name: raw.name || `P${idx + 1}`,
            color: PLAYER_COLORS[idx],
            position: 0,
            powerUps: [],
            skipSnakeActive: false,
            doubleClimbActive: false,
        });
    }

    onForceStart() {
        if (this.players.length >= 2) {
            this.socket?.emit('start-game', { roomCode: this.roomCode, gameId: 'r-ladder' });
        }
    }

    beginGame() {
        this.currentPlayerIdx = 0;
        this.diceRolled = false;
        this.gamePhase = 'playing';
        this.broadcastState();
    }

    broadcastState() {
        if (!this.socket) return;
        const p = this.currentPlayer!;
        if (!p) return;
        const color = p.color;
        this.socket.emit('game-command', {
            roomCode: this.roomCode,
            command: 'rl-state',
            phase: this.gamePhase,
            currentPlayerIdx: this.currentPlayerIdx,
            currentPlayerName: p?.name,
            currentPlayerColor: p?.color,
            currentPlayerSocketId: p?.socketId,
            diceRolled: this.diceRolled,
            diceValue: this.diceValue,
            moving: this.moving,
            question: this.currentQuestion ? {
                text: this.currentQuestion.text,
                options: this.currentQuestion.options,
                timer: this.timerLeft
            } : null,
            result: {
                message: this.resultMessage,
                type: this.resultType
            },
            powerUps: p?.powerUps || [],
            hintUsed: this.hintUsed
        });
    }

    // ── Dice ──────────────────────────────────────────────────────────────────
    rollDice() {
        if (this.diceRolling || this.diceRolled || this.moving) return;
        this.diceRolling = true;
        let ticks = 0;
        this.rollInterval = setInterval(() => {
            this.diceValue = Math.ceil(Math.random() * 6);
            ticks++;
            this.broadcastState();
            if (ticks >= 10) {
                clearInterval(this.rollInterval);
                this.diceRolling = false;
                this.diceRolled = true;
                this.broadcastState();
                this.startMovePlayer(this.diceValue);
            }
        }, 80);
    }

    // ── Movement ───────────────────────────────────────────────────────────────
    startMovePlayer(steps: number) {
        const p = this.currentPlayer;
        this.movingPlayerId = p.id;
        const path: number[] = [];
        for (let i = 1; i <= steps; i++) {
            const next = p.position + i;
            if (next > 100) break;
            path.push(next);
        }
        this.moving = true;
        let step = 0;
        const tick = () => {
            if (step >= path.length) {
                this.moving = false;
                this.movingPlayerId = null;
                setTimeout(() => this.onPlayerLanded(), 400);
                return;
            }
            p.position = path[step++];
            setTimeout(tick, 200);
        };
        tick();
    }

    onPlayerLanded() {
        const pos = this.currentPlayer.position;
        if (pos >= 100) { this.triggerWin(); return; }
        
        const special = BOARD_SPECIAL[pos];
        if (!special) { this.diceRolled = false; this.checkWin(); return; }

        if (special.type === 'power-up' && special.powerUpType) {
            const pu = POWER_UP_DEFS[special.powerUpType];
            this.currentPlayer.powerUps.push({ ...pu });
            this.activePowerUp = pu;
            setTimeout(() => {
                this.activePowerUp = null;
                this.gamePhase = 'playing';
                this.checkWin();
            }, 800);
            return;
        }

        if (special.type === 'snake' && this.currentPlayer.skipSnakeActive) {
            this.currentPlayer.skipSnakeActive = false;
            this.resultMessage = '🛡️ SNAKE SKIPPED! IMMUNITY USED!';
            this.resultType = 'escape';
            this.gamePhase = 'result';
            setTimeout(() => { this.gamePhase = 'playing'; this.diceRolled = false; this.checkWin(); }, 1500);
            return;
        }

        this.currentQuestion = special.question!;
        this.currentSpecial = special;
        this.selectedAnswer = null;
        this.answerResult = null;
        this.hintUsed = false;
        this.hintEliminated = [];
        this.timerLeft = this.timerMax;
        this.timerPct = 100;
        this.gamePhase = 'question';
        this.broadcastState();
        this.startTimer();
    }

    // ── Timer ─────────────────────────────────────────────────────────────────
    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timerLeft--;
            this.timerPct = (this.timerLeft / this.timerMax) * 100;
            this.broadcastState();
            if (this.timerLeft <= 0) { clearInterval(this.timerInterval); this.handleAnswer(-1); }
        }, 1000);
    }

    // ── Answer ─────────────────────────────────────────────────────────────────
    handleAnswer(idx: number) {
        if (this.answerResult) return;
        clearInterval(this.timerInterval);
        this.selectedAnswer = idx;
        const correct = this.currentQuestion!.correct;
        const isCorrect = idx === correct;
        this.answerResult = isCorrect ? 'correct' : 'wrong';

        setTimeout(() => {
            this.gamePhase = 'result';
            const special = this.currentSpecial!;
            const p = this.currentPlayer!;

            if (isCorrect) {
                if (special.type === 'ladder' || special.type === 'mega-ladder') {
                    const dest = special.destination!;
                    const extra = p.doubleClimbActive ? Math.min(dest + 10, 100) - dest : 0;
                    p.doubleClimbActive = false;
                    const finalDest = Math.min(dest + extra, 100);
                    this.resultMessage = `✅ CORRECT! SYNTAX CLIMB → SQUARE ${finalDest}`;
                    this.resultType = 'climb';
                    setTimeout(() => { p.position = finalDest; }, 400);
                } else {
                    this.resultMessage = '✅ CORRECT! BUG FIXED — SNAKE RECOILS!';
                    this.resultType = 'escape';
                }
            } else {
                const timeUp = idx === -1;
                if (special.type === 'ladder' || special.type === 'mega-ladder') {
                    this.resultMessage = timeUp ? '⏰ TIME\'S UP — SYNTAX ERROR!' : '❌ SYNTAX ERROR! REMAIN AT SQUARE ' + p.position;
                    this.resultType = 'fall';
                } else {
                    const dest = special.destination!;
                    this.resultMessage = timeUp ? `⏰ SEGMENTATION FAULT! → SQUARE ${dest}` : `❌ RUNTIME ERROR! SNAKE DRAGS YOU → SQUARE ${dest}`;
                    this.resultType = 'swallowed';
                    setTimeout(() => { p.position = dest; }, 600);
                }
            }

            setTimeout(() => {
                if (p.position >= 100) { this.triggerWin(); return; }
                this.gamePhase = 'playing';
                this.diceRolled = false;
                this.currentQuestion = null;
                this.currentSpecial = null;
                this.checkWin();
                this.broadcastState();
            }, 2500);
        }, 1000);
        this.broadcastState();
    }

    // ── Power-ups ─────────────────────────────────────────────────────────────
    useHint() {
        if (this.hintUsed || !this.currentQuestion) return;
        this.hintUsed = true;
        const correct = this.currentQuestion.correct;
        const wrong = [0, 1, 2].filter(i => i !== correct);
        this.hintEliminated = [wrong[Math.floor(Math.random() * wrong.length)]];
        const idx = this.currentPlayer.powerUps.findIndex(p => p.type === 'HINT_TOKEN');
        if (idx >= 0) this.currentPlayer.powerUps.splice(idx, 1);
    }

    activateSkipSnake() {
        this.currentPlayer.skipSnakeActive = true;
        const idx = this.currentPlayer.powerUps.findIndex(p => p.type === 'SKIP_SNAKE');
        if (idx >= 0) this.currentPlayer.powerUps.splice(idx, 1);
    }

    activateDoubleClimb() {
        this.currentPlayer.doubleClimbActive = true;
        const idx = this.currentPlayer.powerUps.findIndex(p => p.type === 'DOUBLE_CLIMB');
        if (idx >= 0) this.currentPlayer.powerUps.splice(idx, 1);
    }

    useSteal(targetIdx: number) {
        const target = this.players[targetIdx];
        if (!target || target.id === this.currentPlayer.id || target.powerUps.length === 0) return;
        const stolen = target.powerUps.splice(0, 1)[0];
        this.currentPlayer.powerUps.push(stolen);
        const idx = this.currentPlayer.powerUps.findIndex(p => p.type === 'STEAL');
        if (idx >= 0) this.currentPlayer.powerUps.splice(idx, 1);
        this.showSteal = false;
    }

    canUseHint(): boolean { return this.gamePhase === 'question' && !this.hintUsed && this.currentPlayer.powerUps.some(p => p.type === 'HINT_TOKEN'); }
    isEliminated(idx: number): boolean { return this.hintEliminated.includes(idx); }

    // ── Win ───────────────────────────────────────────────────────────────────
    checkWin() {
        if (this.currentPlayer.position >= 100) {
            this.triggerWin();
        } else {
            this.nextTurn();
        }
    }

    triggerWin() {
        this.winner = this.currentPlayer;
        this.gamePhase = 'won';
        this.generateConfetti();
    }

    generateConfetti() {
        const chars = ['CPU', 'RAM', '101', '[]', 'for()', 'if()', 'HTML', 'CSS', '&&', '||', 'fn()', '💻'];
        const colors = ['#FFE000', '#FF4455', '#44FF99', '#FF8844', '#88AAFF'];
        this.confetti = [];
        for (let i = 0; i < 60; i++) {
            this.confetti.push({
                char: chars[Math.floor(Math.random() * chars.length)],
                x: Math.random() * 100,
                y: -10 - Math.random() * 30,
                delay: Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }

    nextTurn() { this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length; }

    resetGame() {
        this.gamePhase = 'waiting';
        this.players = [];
        this.winner = null;
        this.confetti = [];
        this.diceRolled = false;
        this.diceValue = 1;
        clearInterval(this.timerInterval);
        clearInterval(this.rollInterval);
    }

    getDiceDots(val: number): { x: number; y: number }[] {
        const all: Record<number, { x: number; y: number }[]> = {
            1: [{ x: 50, y: 50 }],
            2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
            3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
            4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
            6: [{ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 80 }, { x: 75, y: 80 }],
        };
        return all[val] || [];
    }

    trackByIdx(i: number) { return i; }
    trackByPU(_i: number, p: PowerUp) { return p.type; }
}
