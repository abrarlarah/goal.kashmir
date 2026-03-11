const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  // Text colors
  { regex: /(?<!dark:)text-white/g, replacement: 'text-slate-900 dark:text-white' },
  { regex: /(?<!dark:)text-slate-300/g, replacement: 'text-slate-600 dark:text-slate-300' },
  { regex: /(?<!dark:)text-slate-400/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)text-gray-300/g, replacement: 'text-slate-600 dark:text-gray-300' },
  { regex: /(?<!dark:)text-gray-400/g, replacement: 'text-slate-500 dark:text-gray-400' },
  { regex: /(?<!dark:)text-gray-500/g, replacement: 'text-slate-500 dark:text-gray-500' },

  // Background colors
  { regex: /(?<!dark:)bg-slate-900/g, replacement: 'bg-white dark:bg-slate-900' },
  { regex: /(?<!dark:)bg-slate-800/g, replacement: 'bg-slate-50 dark:bg-slate-800' },
  { regex: /(?<!dark:)bg-slate-700/g, replacement: 'bg-slate-100 dark:bg-slate-700' },
  { regex: /(?<!dark:)bg-gray-900/g, replacement: 'bg-white dark:bg-gray-900' },
  { regex: /(?<!dark:)bg-gray-800/g, replacement: 'bg-slate-50 dark:bg-gray-800' },
  { regex: /(?<!dark:)bg-gray-700/g, replacement: 'bg-slate-100 dark:bg-gray-700' },
  { regex: /(?<!dark:)bg-dark-bg/g, replacement: 'bg-slate-50 dark:bg-dark-bg' },

  // Borders
  { regex: /(?<!dark:)border-slate-700/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /(?<!dark:)border-gray-700/g, replacement: 'border-slate-200 dark:border-gray-700' },
  { regex: /(?<!dark:)border-white\/5/g, replacement: 'border-slate-200 dark:border-white/5' },
  { regex: /(?<!dark:)border-white\/10/g, replacement: 'border-slate-200 dark:border-white/10' },
  { regex: /(?<!dark:)border-white\/20/g, replacement: 'border-slate-200 dark:border-white/20' }
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

      replacements.forEach(rule => {
        const newContent = content.replace(rule.regex, rule.replacement);
        if (newContent !== content) {
          content = newContent;
          changed = true;
        }
      });

      // Cleanup duplicated dark: if any
      content = content.replace(/dark:dark:/g, 'dark:');
      // Cleanup text-slate-900 dark:text-slate-900 dark:text-white
      content = content.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Done.');
