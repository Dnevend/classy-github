import { Hono } from 'hono'

const API_ORIGIN = 'https://api.github.com'

/**
 * 只允许代理这些 GitHub 路径。
 * 之前是 `app.get('/*')` 全量转发，任何人都能把这个 Worker 当自己的 GitHub 客户端用。
 */
const ALLOWED_PREFIXES = ['/users/', '/repos/', '/gists/', '/orgs/', '/search/']

/** 边缘缓存时长（秒）。GitHub 匿名接口是 60 次/小时，缓存是唯一能让它撑住的办法。 */
const CACHE_TTL = 180

/**
 * 固定且可识别的 UA。GitHub 要求请求方提供能标识自己的 User-Agent，
 * 随机 UA 反而更容易被判为滥用（之前用 fake-useragent 每次生成随机值）。
 */
const USER_AGENT =
  'classy-github-proxy/1.1 (+https://github.com/Dnevend/classy-github)'

const app = new Hono()

app.get('/*', async (c) => {
  const { pathname, search } = new URL(c.req.url)

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
  )

  if (!allowed) {
    return c.json(
      {
        message: 'Path not allowed by proxy',
        allowed: ALLOWED_PREFIXES,
      },
      403
    )
  }

  const cache = caches.default
  const cacheKey = new Request(c.req.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)

  if (cached) {
    const hit = new Response(cached.body, cached)
    hit.headers.set('x-classy-cache', 'HIT')
    return hit
  }

  const upstream = await fetch(API_ORIGIN + pathname + search, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/vnd.github+json',
    },
  })

  // 错误（尤其是 403 限流）不进缓存，否则会说谎三分钟
  if (!upstream.ok) return upstream

  const response = new Response(upstream.body, upstream)
  response.headers.set('cache-control', `public, max-age=${CACHE_TTL}`)

  // 缓存副本里不要带上 MISS 标记，否则命中缓存时会对外谎报
  const cachedCopy = response.clone()
  cachedCopy.headers.delete('x-classy-cache')
  c.executionCtx.waitUntil(cache.put(cacheKey, cachedCopy))

  response.headers.set('x-classy-cache', 'MISS')

  return response
})

export default app
