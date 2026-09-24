const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'reports', '[id]', 'smart-report', 'page.tsx');
let content = fs.readFileSync(f, 'utf8');

const beforeCount = (content.match(/min-h-\[1123px\]/g) || []).length;
// Replace min-h-[1123px] -> h-[1123px] so pages have exact fixed height (no overflow clipping)
content = content.split('min-h-[1123px]').join('h-[1123px]');

fs.writeFileSync(f, content, 'utf8');
const afterCount = (content.match(/h-\[1123px\]/g) || []).length;
console.log('Done! Replaced', beforeCount, 'occurrences. Now', afterCount, 'total h-[1123px] usages.');
