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

  export interface DurableObjectStorage {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
  }

  export interface DurableObjectState {
    storage: DurableObjectStorage;
  }

  export class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }

  export interface DurableObjectId {
    toString(): string;
  }

  export interface DurableObjectStub {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }

  export interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }
}

// @astrojs/cloudflare/handler 的声明引用了这两个全局类型；
// 项目没有装 @cloudflare/workers-types，这里补最小定义。
type Env = Record<string, unknown>;

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
