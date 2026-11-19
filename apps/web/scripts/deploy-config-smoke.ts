/**
 * 部署配置断言：根 wrangler 配置和 package 脚本必须指向构建产物，
 * 不能把 dist/server 当成静态资源暴露。
 * 运行：node --experimental-strip-types scripts/deploy-config-smoke.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { scripts?: Record<string, string> };

assert.match(
  wrangler,
  /"directory":\s*"\.\/dist\/client"/,
  'Assets 必须指向 dist/client，避免暴露 dist/server'
);
assert.match(
  pkg.scripts?.deploy ?? '',
  /dist\/server\/wrangler\.json/,
  'apps/web deploy 必须使用生成的 wrangler 配置'
);

const rootPkg = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
) as { scripts?: Record<string, string> };

assert.match(
  rootPkg.scripts?.['deploy:web'] ?? '',
  /dist\/server\/wrangler\.json/,
  '根 deploy:web 必须使用生成的 wrangler 配置'
);

console.log('deploy-config smoke ok');
