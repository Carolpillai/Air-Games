const fs = require('fs');
let rts = fs.readFileSync('src/app/pages/games/r-ladder/r-ladder.ts', 'utf8');

rts = rts.replace(/\s*cat:\s*string;\s*\/\/.*?catCss:\s*string;/gs, "");
rts = rts.replace(/\/\/ ── Cat definitions.*?\};/s, "");
rts = rts.replace(/\s*catCss\(catId: string\): string \{ return CATS\[catId\]\?\.css || 'cat-orange'; \}/, "");
rts = rts.replace(/\s*catLabel\(catId: string\): string \{ return CATS\[catId\]\?\.label || catId; \}/, "");
rts = rts.replace(/\s*const catId = [^\n]+/, "");
rts = rts.replace(/\s*const catDef = [^\n]+/, "");
rts = rts.replace(/\s*cat: [^\n]+/, "");
rts = rts.replace(/\s*catCss: [^\n]+/, "");

if (!rts.includes("onForceStart()")) {
    rts = rts.replace("beginGame() {", "onForceStart() {\n        if (this.players.length >= 2) {\n            this.socket?.emit('start-game', { roomCode: this.roomCode, gameId: 'r-ladder' });\n        }\n    }\n\n    beginGame() {");
}

fs.writeFileSync('src/app/pages/games/r-ladder/r-ladder.ts', rts);
console.log('Fixed TS');
