import { siteOrigin } from "../../lib/site";
import type { APIRoute } from 'astro';
import { loadConfig } from '../../lib/config-loader';
import { safeLoad } from '../../lib/errors';
import { buildAtomFeed } from '../../lib/feed';
import { localeFromConfig } from '../../lib/i18n';
import { loadUserGists } from '../../lib/profile';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';

  const { data, error } = await safeLoad(() => loadUserGists(user));

  if (error) {
    return new Response('GitHub temporarily unavailable', {
      status: error === 'rate-limit' ? 503 : 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (!data) {
    return new Response('User not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const config = await loadConfig(user, { memo: Astro.locals.configMemo });
  const body = buildAtomFeed({
    user,
    userinfo: data.userinfo,
    gists: data.gists,
    origin: siteOrigin(url),
    config,
    locale: localeFromConfig(config.language),
  });

  return new Response(body, {
    headers: {
      'content-type': 'application/atom+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
