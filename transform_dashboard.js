const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Section 1: Hero header makeover (make it rich, vibrant and dark for both modes)
content = content.replace(
  /className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-brand-950 dark:to-slate-900 border border-slate-200 dark:border-white\/10 shadow-sm"/,
  'className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#1E1B4B] to-[#0B1120] border border-white/10 shadow-2xl"'
);

content = content.replace(
  /<h1 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-1">Match Center<\/h1>/,
  '<h1 className="text-2xl sm:text-4xl font-display font-black text-white mb-1 drop-shadow-lg">Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">Center</span></h1>'
);

content = content.replace(
  /<p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">/,
  '<p className="text-slate-300 text-sm sm:text-base font-medium">'
);

content = content.replace(
  /className="w-full bg-slate-50\/80 dark:bg-slate-800\/80 border border-slate-200\/50 dark:border-slate-700\/50 rounded-xl pl-3 pr-8 py-2 text-\[11px\] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm h-10"/g,
  'className="w-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/30 rounded-xl pl-3 pr-8 py-2 text-[11px] sm:text-sm font-bold text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-lg h-10 [&>option]:text-slate-900"'
);

// Section 2: Update all the basic cards to be deep slate/navy glass cards instead of white
content = content.replace(
  /className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white via-brand-50\/50 to-cyan-50\/50 dark:from-slate-900 dark:to-slate-800 border border-brand-100 dark:border-slate-700\/50 hover:border-brand-300 dark:hover:border-brand-500\/50 transition-all shadow-xl hover:shadow-2xl hover:shadow-brand-500\/20 group"/g,
  'className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#121B2E] to-slate-900 border border-brand-500/20 hover:border-brand-500/50 transition-all shadow-2xl shadow-brand-500/5 group text-white"'
);

content = content.replace(
  /className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-white to-brand-50\/80 dark:from-slate-900\/50 dark:to-slate-800\/50 border border-brand-100 dark:border-white\/5 hover:border-brand-300 dark:hover:border-brand-500\/30 hover:shadow-lg hover:shadow-brand-500\/10 transition-all"/g,
  'className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#121B2E] border border-white/5 hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10 transition-all text-white"'
);

content = content.replace(
  /className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900\/50 dark:to-slate-800\/50 border border-slate-200 dark:border-white\/5 hover:border-slate-300 dark:hover:border-brand-500\/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"/g,
  'className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-[#121B2E] to-slate-900 border border-white/5 hover:border-brand-500/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-white"'
);

content = content.replace(
  /className="rounded-2xl bg-gradient-to-br from-white via-brand-50\/30 to-brand-100\/50 dark:from-slate-900\/80 dark:to-slate-900\/40 border border-brand-100 dark:border-white\/5 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-brand-500\/5 transition-all duration-300"/g,
  'className="rounded-2xl bg-gradient-to-br from-slate-900 via-[#121B2E] to-slate-900 border border-white/5 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 text-white"'
);

content = content.replace(
  /className="rounded-2xl bg-white\/60 dark:bg-slate-900\/60 border border-slate-200\/5 dark:border-white\/5 overflow-hidden"/g,
  'className="rounded-2xl bg-gradient-to-br from-[#121B2E] to-slate-900 border border-white/5 overflow-hidden text-white shadow-xl"'
);

// Specifically ensure matches and data text is white for the cards (override the light mode overrides)
let parts = content.split('{/* ═══ MAIN GRID ═══ */}');
if (parts.length > 1) {
    let mainGrid = parts[1];
    
    // Replace typical light text colors with white / light variations
    mainGrid = mainGrid.replace(/text-slate-900 dark:text-white/g, 'text-white');
    mainGrid = mainGrid.replace(/text-slate-700 dark:text-slate-200/g, 'text-slate-200');
    mainGrid = mainGrid.replace(/text-slate-600 dark:text-slate-300/g, 'text-slate-300');
    mainGrid = mainGrid.replace(/text-slate-500 dark:text-slate-400/g, 'text-slate-400');
    
    // Some isolated light classes
    mainGrid = mainGrid.replace(/text-slate-900/g, 'text-white');
    mainGrid = mainGrid.replace(/text-slate-700/g, 'text-slate-200');
    mainGrid = mainGrid.replace(/text-slate-600/g, 'text-slate-300');
    
    // Fix backgrounds of inner elements like headers / borders
    mainGrid = mainGrid.replace(/bg-slate-50\/40 dark:bg-slate-800\/40/g, 'bg-slate-800/60 border border-white/5');
    mainGrid = mainGrid.replace(/bg-slate-100 dark:bg-slate-800/g, 'bg-slate-800 border-white/10 text-white');
    mainGrid = mainGrid.replace(/bg-slate-50 dark:bg-slate-800/g, 'bg-slate-800 text-white');
    mainGrid = mainGrid.replace(/bg-white\/60 dark:bg-slate-900\/60/g, 'bg-slate-800/50');
    mainGrid = mainGrid.replace(/border-slate-200\/50 dark:border-slate-700\/50/g, 'border-slate-700/50');
    mainGrid = mainGrid.replace(/border-slate-200\/5 dark:border-white\/5/g, 'border-white/5');
    mainGrid = mainGrid.replace(/bg-slate-100\/50 dark:bg-white\/5/g, 'bg-white/5 border border-white/5');
    mainGrid = mainGrid.replace(/bg-white\/50 dark:bg-slate-900\/50/g, 'bg-slate-800/50');
    mainGrid = mainGrid.replace(/bg-slate-50\/50 dark:bg-slate-800\/50/g, 'bg-slate-800/80');

    content = parts[0] + '{/* ═══ MAIN GRID ═══ */}' + mainGrid;
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully transformed Dashboard.jsx');
