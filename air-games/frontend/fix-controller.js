const fs = require('fs');

// Controller.ts
let cTs = fs.readFileSync('src/app/pages/controller/controller.ts', 'utf8');

cTs = cTs.replace(/\n\s*\/\/ Cat selection \(for r-ladder\)[\s\S]*?(?=\/\/ Sensors data)/, "\n  ");
cTs = cTs.replace(/\n\s*chooseCat\(catId: string\) \{[\s\S]*?(?=setReady)/, "");
cTs = cTs.replace(/,\n\s*cat: this\.selectedCat \|\| 'orange'/g, "");
fs.writeFileSync('src/app/pages/controller/controller.ts', cTs);

let cHtml = fs.readFileSync('src/app/pages/controller/controller.html', 'utf8');
let catScreenIdx = cHtml.indexOf('<!-- Step 1.5: Cat Picker');
if (catScreenIdx !== -1) {
    let nextStepIdx = cHtml.indexOf('<!-- Step 2: Non-r-ladder ready prompt');
    cHtml = cHtml.substring(0, catScreenIdx) + '<!-- Step 2: Ready prompt -->\n    <div class="ready-prompt" *ngIf="connected && !isReady">' + cHtml.substring(cHtml.indexOf('<div class="player-info">', nextStepIdx) - 9);
}
fs.writeFileSync('src/app/pages/controller/controller.html', cHtml);

console.log('Fixed controller');
