const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const fixes = [
  // Fix background opacities missed by initial replace
  { regex: /bg-white dark:bg-slate-900\/(\d+)/g, replacement: 'bg-white/$1 dark:bg-slate-900/$1' },
  { regex: /bg-slate-50 dark:bg-slate-800\/(\d+)/g, replacement: 'bg-slate-50/$1 dark:bg-slate-800/$1' },
  { regex: /bg-slate-100 dark:bg-slate-700\/(\d+)/g, replacement: 'bg-slate-100/$1 dark:bg-slate-700/$1' },
  { regex: /bg-white dark:bg-gray-900\/(\d+)/g, replacement: 'bg-white/$1 dark:bg-gray-900/$1' },
  { regex: /bg-slate-50 dark:bg-gray-800\/(\d+)/g, replacement: 'bg-slate-50/$1 dark:bg-gray-800/$1' },
  { regex: /bg-slate-100 dark:bg-gray-700\/(\d+)/g, replacement: 'bg-slate-100/$1 dark:bg-gray-700/$1' },

  // Borders
  { regex: /border-slate-200 dark:border-slate-700\/(\d+)/g, replacement: 'border-slate-200/$1 dark:border-slate-700/$1' },
  { regex: /border-slate-200 dark:border-gray-700\/(\d+)/g, replacement: 'border-slate-200/$1 dark:border-gray-700/$1' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      fixes.forEach(rule => {
        const newContent = content.replace(rule.regex, rule.replacement);
        if (newContent !== content) {
          content = newContent;
          changed = true;
        }
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed opacities in ${fullPath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Opacity fixes done.');
