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
    },
  },
});
