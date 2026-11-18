import { rm } from 'node:fs/promises';

// Astro's prerender step copies .dev.vars into the server build output.
// It must never ship with the Worker: production secrets are set with
// `wrangler secret put`, not read from a file in dist/.
const targets = [
  new URL('../dist/server/.dev.vars', import.meta.url),
  new URL('../dist/server/.prerender/.dev.vars', import.meta.url),
];

for (const target of targets) {
  await rm(target, { force: true });
}

console.log('removed .dev.vars from dist');
