const fs = require('fs');

let r = fs.readFileSync('src/app/pages/games/r-ladder/r-ladder.ts', 'utf8');

// 1. Player fields
r = r.replace(/cat:\s*string;\s*\/\/.*?\n/g, "");
r = r.replace(/catCss:\s*string;.*?\n/g, "");

// 2. Constants 
let catStart = r.indexOf('// ── Cat definitions');
if (catStart > -1) {
    let colorStart = r.indexOf('const PLAYER_COLORS');
    r = r.substring(0, catStart) + r.substring(colorStart);
}

// 3. methods
r = r.replace(/catCss\(catId: string\): string \{.*?\}/s, "");
r = r.replace(/catLabel\(catId: string\): string \{.*?\}/s, "");

// 4. addPlayer changes
r = r.replace(/const catId = [^\n]+\n/g, '');
r = r.replace(/const catDef = [^\n]+\n/g, '');
r = r.replace(/cat: catId,\n/g, '');
r = r.replace(/catCss:[^\n]+\n/g, '');

// 5. beginGame hook
if (!r.includes('onForceStart')) {
    let bgi = r.indexOf('beginGame() {');
    r = r.substring(0, bgi) + "\n    onForceStart() {\n        if (this.players.length >= 2) {\n            this.socket?.emit('start-game', { roomCode: this.roomCode, gameId: 'r-ladder' });\n        }\n    }\n\n    " + r.substring(bgi);
}

fs.writeFileSync('src/app/pages/games/r-ladder/r-ladder.ts', r);


let h = fs.readFileSync('src/app/pages/games/r-ladder/r-ladder.html', 'utf8');

h = h.replace(/<div class="wcat-name">.*<\/div>/g, '<div class="wcat-name">{{p.name || \'PLAYER \' + (i+1)}}</div>');
h = h.replace(/<div class="pixel-cat \[class\]="p\.catCss"><\/div>/g, '<div class="preview-icon">👤</div>');
h = h.replace(/<div class="rl-cat-label">.*?<\/div>/g, '<div class="rl-cat-label">WAITING FOR HOST...</div>');

// Remove special tokens
h = h.replace(/<div class="pixel-cat cat-token.*?<\/div>/g, '<div class="token">{{p.name\[0\]}}</div>');
h = h.replace(/<div class="pixel-cat pr-cat \[class\]="player\.catCss"><\/div>/g, '<div class="pr-cat">👤</div>');
h = h.replace(/<div class="pixel-cat tb-cat \[class\]="p\.catCss"><\/div>/g, '<div class="tb-cat">👤</div>');
h = h.replace(/<div class="pixel-cat win-cat.*?<\/div>/g, '<div class="win-cat" style="font-size: 40px">👑</div>');
h = h.replace(/<div class="pixel-cat cp-icon \[class\]="currentPlayer\.catCss"><\/div>/g, '<div class="cp-icon">👤</div>');


// Add START Button
if (!h.includes('START R LADDER')) {
    h = h.replace('<!-- IF NOT HOST -->', `<button class="pixel-btn start-btn" (click)="onForceStart()" *ngIf="isHost()" [disabled]="players.length < 2" style="margin-top:20px;">▶ START R LADDER</button>\n<!-- IF NOT HOST -->`);
    // wait, what is the host check if isHost() doesnt exist?
    // Host is anyone showing the main game board instead of just controller
    // The waiting room IS the host screen.
    h = h.replace('<div class="waiting-hint">', `<button class="pixel-btn start-btn" (click)="onForceStart()" [disabled]="players.length < 2" style="margin-top:16px;">▶ START R LADDER</button>\n      <div class="waiting-hint">`);
}


fs.writeFileSync('src/app/pages/games/r-ladder/r-ladder.html', h);
console.log('Fixed properly');
