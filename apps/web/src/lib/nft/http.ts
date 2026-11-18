import {
  isSecureUrl,
  sessionCookieName,
  verifySession,
  type SessionPayload,
} from './session.ts';

export const jsonResponse = (
  data: unknown,
  status = 200,
  cacheControl = 'no-store'
): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });

export const errorResponse = (
  error: string,
  status = 400,
  extra: Record<string, unknown> = {}
): Response => jsonResponse({ error, ...extra }, status);

export const readJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

/** Allow same-origin browser requests; allow non-browser clients without Origin. */
export const originAllowed = (request: Request, url: URL): boolean => {
  const origin = request.headers.get('origin');
  return !origin || origin === url.origin;
};

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export const readSession = async (
  cookies: CookieReader,
  url: URL,
  secret: string
): Promise<SessionPayload | null> => {
  const token = cookies.get(sessionCookieName(isSecureUrl(url)))?.value;
  return token ? verifySession(token, secret) : null;
};
