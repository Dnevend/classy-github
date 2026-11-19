import { USER_AGENT } from '../constants.ts';

export class OAuthError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
  }
}

export interface GitHubUser {
  id: number;
  login: string;
  created_at: string;
  name?: string | null;
  avatar_url?: string;
}

export const buildAuthorizeUrl = ({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string => {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
};

export const exchangeCode = async ({
  clientId,
  clientSecret,
  code,
  redirectUri,
  fetchImpl = fetch,
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<string> => {
  const response = await fetchImpl(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': USER_AGENT,
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    }
  );

  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !data?.access_token) {
    throw new OAuthError(
      data?.error || 'token_exchange_failed',
      data?.error_description || 'GitHub token exchange failed'
    );
  }

  return data.access_token;
};

export const fetchGitHubUser = async (
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<GitHubUser> => {
  const response = await fetchImpl('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': USER_AGENT,
      'x-github-api-version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new OAuthError('user_fetch_failed', `GitHub user: ${response.status}`);
  }

  const user = (await response.json()) as GitHubUser;
  if (
    typeof user.id !== 'number' ||
    typeof user.login !== 'string' ||
    typeof user.created_at !== 'string'
  ) {
    throw new OAuthError('user_fetch_failed', 'GitHub user payload is invalid');
  }

  return user;
};
