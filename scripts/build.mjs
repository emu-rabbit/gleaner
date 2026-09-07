import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
await copyFile('.nojekyll', 'dist/.nojekyll');
console.log('Static site built in dist/');
