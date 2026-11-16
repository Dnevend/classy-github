import type { Gist, User } from '@classy/types/github';
import type { ResolvedConfig } from './config.ts';
import type { Locale } from './i18n.ts';
import { createGistDescriptionParser } from './gist-rule.ts';
import { translate } from './i18n.ts';

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[
        char
      ] ?? char
  );

const iso = (value: string | undefined) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export interface FeedOptions {
  user: string;
  userinfo: User;
  gists: Gist[];
  origin: string;
  config: ResolvedConfig;
  locale: Locale;
  limit?: number;
}

/**
 * Atom feed：把 Gist 变成真正可订阅的博客。
 * 纯函数，便于在 node 里断言（见 scripts/community-smoke.ts）。
 */
export const buildAtomFeed = ({
  user,
  userinfo,
  gists,
  origin,
  config,
  locale,
  limit = 50,
}: FeedOptions): string => {
  const display = userinfo.name || userinfo.login || user;
  const parse = createGistDescriptionParser({
    prefix: config.gists.prefix,
    split: config.gists.split,
  });

  const sorted = [...gists].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at).getTime() -
      new Date(a.updated_at || a.created_at).getTime()
  );

  const entries = sorted.slice(0, limit).map((gist) => {
      const parsed = parse(gist.description);
      const title =
        parsed.title || Object.keys(gist.files ?? {})[0] || translate(locale, 'gist.untitled');
      const firstFile = Object.values(gist.files ?? {})[0];
      const summary =
        gist.description?.trim() ||
        (firstFile ? `${firstFile.filename}` : '');
      const updated = iso(gist.updated_at || gist.created_at);
      const published = iso(gist.created_at);

      return `<entry>
  <title>${escapeXml(title)}</title>
  <link href="${escapeXml(`${origin}/${encodeURIComponent(user)}/gist/${encodeURIComponent(gist.id)}`)}"/>
  <id>${escapeXml(`tag:classygit,2026:${gist.id}`)}</id>
  <updated>${updated}</updated>
  <published>${published}</published>
  ${parsed.type ? `<category term="${escapeXml(parsed.type)}"/>` : ''}
  <summary>${escapeXml(summary)}</summary>
</entry>`;
    });

  const updated = sorted[0]
    ? iso(sorted[0].updated_at || sorted[0].created_at)
    : new Date().toISOString();
  const feedUrl = `${origin}/${encodeURIComponent(user)}/rss.xml`;
  const homeUrl = `${origin}/${encodeURIComponent(user)}`;

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">
  <title>${escapeXml(translate(locale, 'gists.title', { name: display }))} · ClassyGit</title>
  <subtitle>${escapeXml(translate(locale, 'gists.desc', { name: display, count: gists.length }))}</subtitle>
  <link href="${escapeXml(homeUrl)}" rel="alternate" type="text/html"/>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>
  <id>${escapeXml(`tag:classygit,2026:${userinfo.login}`)}</id>
  <updated>${updated}</updated>
  <author>
    <name>${escapeXml(display)}</name>
    <uri>${escapeXml(homeUrl)}</uri>
  </author>
${entries.join('\n')}
</feed>`;
};
