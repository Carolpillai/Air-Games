const fs = require('fs');

function removeCats(text) {
    // 1. Remove cat fields syntax from Player interface
    text = text.replace(/cat:\s*string;[\s\/\w,'-]*\n/, '');

    // Attempt removing another variation if first missed `cat: string;`
    text = text.replace(/\s*cat: string;.*?\n?/g, "");
    text = text.replace(/\s*catCss: string;.*?\n?/g, "");

    // 2. Remove CATS const mapping completely
    const catsStart = text.indexOf('// ── Cat definitions');
    const colorsStart = text.indexOf('const PLAYER_COLORS');
    if (catsStart !== -1 && colorsStart !== -1) {
        text = text.substring(0, catsStart) + text.substring(colorsStart);
    }

    // 3. Remove cat helper methods inside RLadder class
    text = text.replace(/catCss\(catId: string\): string \{.*?\}/s, '');
    text = text.replace(/catLabel\(catId: string\): string \{.*?\}/s, '');

    // 4. In addPlayer, remove 'cat' logic
    text = text.replace(/const catId = raw\.cat \|\| 'orange';\n/, '');
    text = text.replace(/const catDef = CATS\[catId\] \|\| CATS\['orange'\];\n/, '');
    text = text.replace(/cat: catId,\n/, '');
    text = text.replace(/catCss: catDef\.css,\n/, '');

    // 5. Add onForceStart method if it isn't there
    if (!text.includes('onForceStart()')) {
        const beginGameIndex = text.indexOf('beginGame() {');
        if (beginGameIndex !== -1) {
            const forceStartStr = `
    onForceStart() {
        if (this.players.length >= 2) {
            this.socket?.emit('start-game', { roomCode: this.roomCode, gameId: 'r-ladder' });
        }
    }
            
    `;
            text = text.substring(0, beginGameIndex) + forceStartStr + text.substring(beginGameIndex);
        }
    }

    return text;
}

const p = 'src/app/pages/games/r-ladder/r-ladder.ts';
let code = fs.readFileSync(p, 'utf8');
const fixed = removeCats(code);
fs.writeFileSync(p, fixed);

let html = fs.readFileSync('src/app/pages/games/r-ladder/r-ladder.html', 'utf8');
// remove cat rendering
html = html.replace(/<div class="wcat-name">.*<\/div>/g, '<div class="wcat-name">{{p.name || \'PLAYER \' + (i+1)}}</div>');
html = html.replace(/<div class="pixel-cat \[class\]="p.catCss"><\/div>/g, '<div class="preview-icon">👤</div>');
html = html.replace(/<div class="rl-cat-label">.*?<\/div>/g, '<div class="rl-cat-label">WAITING FOR HOST...</div>');

// Add start button
if (!html.includes('onForceStart()')) {
    html = html.replace(
        '<!-- IF NOT HOST -->',
        `<button class="pixel-btn start-btn" (click)="onForceStart()" [disabled]="players.length < 2" style="margin-top:20px; font-size: 14px; padding: 15px;">▶ START R LADDER</button>\n<!-- IF NOT HOST -->`
    );
}

fs.writeFileSync('src/app/pages/games/r-ladder/r-ladder.html', html);

console.log("Fixed!");
