/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** 由 middleware 解析：?theme= > cookie > default */
    theme: import('./lib/config').ThemeName;
    /** 由 middleware 解析：?lang= > cookie > auto */
    localeChoice: import('./lib/i18n').Locale | 'auto';
    /** 最终生效的语言（auto 时页面会用配置里的 language 覆盖） */
    locale: import('./lib/i18n').Locale;
  }
}

// Astro v6 起 `Astro.locals.runtime.env` 被移除，改用 `cloudflare:workers` 的 env。
// 这里补一个最小声明，避免依赖 @cloudflare/workers-types。
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
