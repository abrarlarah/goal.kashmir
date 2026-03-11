const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. HERO HEADER
content = content.replace(
  /className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-brand-950 dark:to-slate-900 border border-slate-200 dark:border-white\/10 shadow-sm"/,
  'className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-slate-50 to-brand-50/50 dark:from-[#020617] dark:via-[#1e1b4b] dark:to-[#0f172a] border border-slate-200/80 dark:border-brand-500/20 shadow-xl dark:shadow-2xl dark:shadow-brand-900/40"'
);

// 2. HERO TITLES
content = content.replace(
  /<h1 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-1">Match Center<\/h1>/,
  '<h1 className="text-2xl sm:text-4xl font-display font-black text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg mb-1">Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-500 dark:from-brand-400 dark:to-cyan-400">Center</span></h1>'
);

// 3. FILTERS (Single line scrolling, keeping light mode distinct from dark)
content = content.replace(
  /className="w-full bg-slate-50\/80 dark:bg-slate-800\/80 border border-slate-200\/50 dark:border-slate-700\/50 rounded-xl pl-3 pr-8 py-2 text-\[11px\] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm h-10"/g,
  'className="w-full bg-white/90 dark:bg-white/10 backdrop-blur-md border border-slate-200/80 dark:border-white/20 hover:border-brand-400 dark:hover:border-white/30 rounded-xl pl-3 pr-8 py-2 text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm dark:shadow-lg h-10 [&>option]:text-slate-900"'
);

// 4. LIVE MATCH CARDS
content = content.replace(
  /className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200\/50 dark:border-slate-700\/50 hover:border-brand-500\/50 transition-all shadow-2xl shadow-black\/40 group"/g,
  'className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] ring-1 ring-slate-200/80 dark:ring-white/10 hover:ring-2 hover:ring-brand-500/50 transition-all shadow-xl dark:shadow-2xl dark:hover:shadow-brand-500/20 group text-slate-900 dark:text-white"'
);

// Live Match Header inside
content = content.replace(
  /className="flex flex-row justify-between items-center gap-1.5 sm:gap-2 mb-3 bg-slate-50\/40 dark:bg-slate-800\/40 p-1.5 sm:p-2.5 rounded-xl border border-slate-200\/5 dark:border-white\/5 shadow-inner"/g,
  'className="flex flex-row justify-between items-center gap-1.5 sm:gap-2 mb-3 bg-white/60 dark:bg-slate-800/60 p-1.5 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-inner dark:shadow-none"'
);

// Scorebox
content = content.replace(
  /className="px-3 sm:px-4 py-1.5 bg-black\/40 rounded-xl border border-slate-200\/5 dark:border-white\/5 backdrop-blur-md flex-shrink-0"/g,
  'className="px-3 sm:px-4 py-1.5 bg-slate-100/80 dark:bg-black/40 rounded-xl border border-slate-200/80 dark:border-white/5 backdrop-blur-md flex-shrink-0"'
);


// 5. UPCOMING MATCH CARDS
content = content.replace(
  /className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-slate-80\/50 border border-slate-200\/50 dark:border-white\/5 hover:border-brand-500\/30 hover:bg-slate-50\/50 dark:hover:bg-slate-800\/50 transition-all"/g,
  'className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-white to-slate-50 dark:from-[#0f172a] dark:to-[#020617] ring-1 ring-slate-200/80 dark:ring-white/5 hover:ring-brand-500/50 dark:hover:shadow-lg dark:hover:shadow-cyan-500/10 transition-all shadow-sm"'
);

// Bugfix the typo in the regex just in case
content = content.replace(
  /className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-slate-800\/50 border border-slate-200\/50 dark:border-white\/5 hover:border-brand-500\/30 hover:bg-slate-50\/50 dark:hover:bg-slate-800\/50 transition-all"/g,
  'className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-white to-slate-50 dark:from-[#0f172a] dark:to-[#020617] ring-1 ring-slate-200/80 dark:ring-white/5 hover:ring-brand-500/50 dark:hover:shadow-lg dark:hover:shadow-cyan-500/10 transition-all shadow-sm"'
);


// 6. RECENT RESULTS CARDS
content = content.replace(
  /className="p-3.5 sm:p-4 rounded-xl bg-slate-800\/50 border border-white\/5 hover:border-brand-500\/30 hover:bg-slate-800\/80 transition-all"/g,
  'className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:to-[#020617] ring-1 ring-slate-200/80 dark:ring-white/5 hover:ring-slate-300 dark:hover:ring-white/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm"'
);


// 7. RIGHT COLUMN SECTIONS (Standings, Scorers, Assists, District, This week)
content = content.replace(
  /className="rounded-2xl bg-white\/60 dark:bg-slate-900\/60 border border-slate-200\/5 dark:border-white\/5 overflow-hidden"/g,
  'className="rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:via-[#020617] dark:to-[#0f172a] ring-1 ring-slate-200/80 dark:ring-white/5 overflow-hidden shadow-xl dark:shadow-2xl dark:hover:shadow-brand-500/5 transition-all duration-300"'
);

// Header replacements
content = content.replace(
  /className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white/g,
  'className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white drop-shadow-sm'
);


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added vibrant dark styles while preserving light styles.');
