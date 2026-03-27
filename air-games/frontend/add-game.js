const fs = require('fs');
let t = fs.readFileSync('src/app/pages/home/home.ts', 'utf8');
const insert = `,
    {
      id: 'toc-battle',
      name: 'TOC-BATTLE',
      description: 'Theory of Computation FIGHT! 2-player arcade brawler with CS knowledge power-ups!',
      players: '2',
      icon: '🥊',
      local: false
    }`;
// Find the last game entry ending
t = t.replace(/(\s+local: false\n\s+}\n\s+\];)/, insert + '\n  ];');
fs.writeFileSync('src/app/pages/home/home.ts', t);
console.log('done');
