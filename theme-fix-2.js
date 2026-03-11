const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const fixes = [
  // Fix text opacities missed by initial replace
  { regex: /text-slate-900 dark:text-white\/(\d+)/g, replacement: 'text-slate-900/$1 dark:text-white/$1' },
  { regex: /text-slate-600 dark:text-slate-300\/(\d+)/g, replacement: 'text-slate-600/$1 dark:text-slate-300/$1' },
  { regex: /text-slate-500 dark:text-slate-400\/(\d+)/g, replacement: 'text-slate-500/$1 dark:text-slate-400/$1' },
  { regex: /text-slate-600 dark:text-gray-300\/(\d+)/g, replacement: 'text-slate-600/$1 dark:text-gray-300/$1' },
  { regex: /text-slate-500 dark:text-gray-400\/(\d+)/g, replacement: 'text-slate-500/$1 dark:text-gray-400/$1' },
  { regex: /border-slate-200 dark:border-white\/(\d+)/g, replacement: 'border-slate-200/$1 dark:border-white/$1' },
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
console.log('Opacity fixes 2 done.');
