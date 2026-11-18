import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// M1 只做最小切片：默认 static 输出，动态路由用 `export const prerender = false`
// 显式退出预渲染（而不是整站 server，静态页仍走边缘静态资源）。
export default defineConfig({
  // 不使用 astro:assets，图片走 passthrough，避免绑定 Cloudflare Images
  adapter: cloudflare({ imageService: 'passthrough' }),
  // 不需要服务端会话，关掉以免部署时要求 KV 命名空间
  session: false,
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Worker 里不需要 sourcemap，体积能省一半
      sourcemap: false,
      // 98.css 里有 lightningcss 判为「非法媒体查询」的写法（第三方老 CSS），
      // 用 esbuild 压缩更宽容
      cssMinify: 'esbuild',
    },
  },
  env: {
    schema: {
      /**
       * GitHub fine-grained PAT，只读 public repo。
       * 生产：`wrangler secret put GITHUB_TOKEN`
       * 本地：写进 apps/web/.dev.vars（已在 .gitignore 里）
       * 不配也能跑，但会退回匿名 60 次/小时。
       */
      GITHUB_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      /**
       * ClassyGit Pass OAuth + minting secrets.
       * Local: apps/web/.dev.vars; production: `wrangler secret put`.
       */
      GITHUB_OAUTH_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GITHUB_OAUTH_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_SESSION_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_SIGNER_PRIVATE_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_SIGNER_ADDRESS: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      RELAYER_PRIVATE_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      RELAYER_ADDRESS: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_CLAIM_SALT: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_CONTRACT_ADDRESS: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_CHAIN_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      BASE_RPC_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      NFT_MIN_ACCOUNT_AGE_DAYS: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      /**
       * Cloudflare Web Analytics 的站点 token（可选）。
       * 构建时内联进 HTML；不配就不注入任何脚本，fork 自建也不会把数据打到上游实例。
       * 生产：在 apps/web/.env 里写 PUBLIC_CF_ANALYTICS_TOKEN=...
       * 注意：主域名是 classygit.dev，直接绑在 Worker 上；classygit.pages.dev
       * 只是 Pages 的 _worker.js 代理。Cloudflare 的「自动安装」注入不到
       * Worker 渲染的 HTML，所以只能手动放片段。
       */
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
});
