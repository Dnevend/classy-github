const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_TTL_SECONDS = 15 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export interface SessionInput {
  ghId: number;
  login: string;
  createdAt: string;
}

export interface SessionPayload extends SessionInput {
  sid: string;
  iat: number;
  exp: number;
}

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const keyFor = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

export const randomHex = (bytes = 16): string => {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
};

export const signValue = async (
  payload: unknown,
  secret: string
): Promise<string> => {
  const data = encoder.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await keyFor(secret),
    data
  );
  return `${bytesToBase64Url(data)}.${bytesToBase64Url(
    new Uint8Array(signature)
  )}`;
};

export const verifyValue = async <T extends { exp?: number }>(
  token: string,
  secret: string,
  now = Date.now()
): Promise<T | null> => {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  try {
    const data = base64UrlToBytes(encoded);
    const sig = base64UrlToBytes(signature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      await keyFor(secret),
      sig,
      data
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(data)) as T;
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const createSession = async (
  input: SessionInput,
  secret: string,
  ttlSeconds = SESSION_TTL_SECONDS,
  now = Date.now()
): Promise<string> => {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sid: randomHex(16),
    ...input,
    iat,
    exp: iat + ttlSeconds,
  };
  return signValue(payload, secret);
};

export const verifySession = async (
  token: string,
  secret: string,
  now = Date.now()
): Promise<SessionPayload | null> => {
  const payload = await verifyValue<SessionPayload>(token, secret, now);
  if (!payload) return null;
  if (
    typeof payload.sid !== 'string' ||
    typeof payload.ghId !== 'number' ||
    typeof payload.login !== 'string' ||
    typeof payload.createdAt !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    return null;
  }
  return payload;
};

export const createOAuthState = async (
  secret: string,
  ttlSeconds = OAUTH_STATE_TTL_SECONDS,
  now = Date.now()
): Promise<{ state: string; cookieValue: string }> => {
  const state = randomHex(16);
  const cookieValue = await signValue(
    { state, exp: Math.floor(now / 1000) + ttlSeconds },
    secret
  );
  return { state, cookieValue };
};

export const verifyOAuthState = async (
  cookieValue: string,
  state: string,
  secret: string,
  now = Date.now()
): Promise<boolean> => {
  const payload = await verifyValue<{ state: string; exp: number }>(
    cookieValue,
    secret,
    now
  );
  return Boolean(payload && payload.state === state);
};

export const isSecureUrl = (url: URL): boolean => url.protocol === 'https:';

export const sessionCookieName = (secure: boolean): string =>
  secure ? '__Host-classy' + '_nft' : 'classy_nft_dev';

export const oauthCookieName = (secure: boolean): string =>
  secure ? '__Host-classy' + '_oauth' : 'classy_oauth_dev';

export const cookieOptions = (url: URL, maxAge: number) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isSecureUrl(url),
  maxAge,
});
