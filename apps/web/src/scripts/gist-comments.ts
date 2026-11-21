import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Gist 评论的浏览器端渲染。
 *
 * 评论直接从 api.github.com 拉取，不带 Authorization：用的是访客自己的
 * 匿名配额（60 次/小时/IP），不占站点的 REST / GraphQL 额度。
 * 请求失败或限流时只影响评论区，不影响正文。
 */

interface GitHubGistComment {
  id: number;
  body: string;
  created_at: string;
  user: {
    login: string;
    html_url: string;
    avatar_url: string;
  } | null;
}

interface CommentCache {
  at: number;
  comments: GitHubGistComment[];
}

const MAX_BODY_LENGTH = 5000;
const CACHE_TTL = 5 * 60 * 1000;
const COUNT_PLACEHOLDER = '__count__';

const isGistComment = (value: unknown): value is GitHubGistComment => {
  if (!value || typeof value !== 'object') return false;

  const comment = value as Record<string, unknown>;
  return (
    typeof comment.id === 'number' &&
    typeof comment.body === 'string' &&
    typeof comment.created_at === 'string'
  );
};

const readCache = (key: string): GitHubGistComment[] | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CommentCache;
    if (
      !cached ||
      typeof cached.at !== 'number' ||
      Date.now() - cached.at > CACHE_TTL ||
      !Array.isArray(cached.comments) ||
      !cached.comments.every(isGistComment)
    ) {
      return null;
    }

    return cached.comments;
  } catch {
    return null;
  }
};

const writeCache = (key: string, comments: GitHubGistComment[]): void => {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ at: Date.now(), comments } satisfies CommentCache)
    );
  } catch {
    // 隐私模式 / 存储禁用时静默跳过
  }
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const locale = document.documentElement.lang
    .toLowerCase()
    .startsWith('zh')
    ? 'zh-CN'
    : 'en';

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return value.slice(0, 10);
  }
};

const sanitizeBody = (body: string): string => {
  const source =
    body.length > MAX_BODY_LENGTH ? body.slice(0, MAX_BODY_LENGTH) : body;
  const html = marked.parse(source, {
    async: false,
    breaks: true,
    gfm: true,
  });

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'del',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'sup',
      'sub',
      'kbd',
    ],
    ALLOWED_ATTR: ['href', 'title', 'align', 'target', 'rel'],
    FORBID_TAGS: [
      'img',
      'picture',
      'source',
      'figure',
      'figcaption',
      'style',
      'script',
      'iframe',
      'video',
      'audio',
      'form',
      'input',
      'button',
    ],
    FORBID_ATTR: ['style', 'class', 'id'],
  });
};

const updateHeading = (section: HTMLElement, count: number): void => {
  const heading = section.querySelector<HTMLElement>('[data-comments-heading]');
  const template = section.dataset.countTemplate;
  if (!heading || !template) return;

  const display = count >= 100 ? '100+' : String(count);
  heading.textContent = template.replace(COUNT_PLACEHOLDER, display);
};

const renderComment = (
  comment: GitHubGistComment,
  section: HTMLElement
): HTMLLIElement => {
  const item = document.createElement('li');
  item.className = 'guestbook-entry';

  const head = document.createElement('div');
  head.className = 'guestbook-entry__head';

  const login = comment.user?.login || 'ghost';
  const profileUrl =
    comment.user?.html_url ||
    `https://github.com/${encodeURIComponent(login)}`;

  if (comment.user) {
    const avatar = document.createElement('img');
    avatar.className = 'guestbook-entry__avatar';
    avatar.src =
      comment.user.avatar_url ||
      `https://github.com/${encodeURIComponent(login)}.png?size=64`;
    avatar.alt = '';
    avatar.width = 32;
    avatar.height = 32;
    avatar.loading = 'lazy';
    avatar.decoding = 'async';
    avatar.dataset.avatar = '1';
    head.append(avatar);
  }

  const meta = document.createElement('div');
  const author = document.createElement('a');
  author.className = 'guestbook-entry__name';
  author.href = profileUrl;
  author.target = '_blank';
  author.rel = 'noopener noreferrer';
  author.textContent = `@${login}`;

  const date = document.createElement('time');
  date.className = 'guestbook-entry__date';
  date.dateTime = comment.created_at;
  date.textContent = formatDate(comment.created_at);

  meta.append(author, date);
  head.append(meta);
  item.append(head);

  const body = document.createElement('div');
  body.className = 'prose';

  try {
    body.innerHTML = sanitizeBody(comment.body);
  } catch {
    // 单条评论渲染失败时保留纯文本，不影响其他评论
    const fallback = document.createElement('p');
    fallback.textContent = comment.body.slice(0, MAX_BODY_LENGTH);
    body.append(fallback);
  }

  item.append(body);

  if (comment.body.length > MAX_BODY_LENGTH) {
    const more = document.createElement('a');
    more.className = 'guestbook-entry__more';
    more.href = `${section.dataset.gistUrl ?? ''}#gistcomment-${comment.id}`;
    more.target = '_blank';
    more.rel = 'noopener noreferrer';
    more.textContent = section.dataset.labelView || 'View on GitHub';
    item.append(more);
  }

  return item;
};

const renderComments = (
  section: HTMLElement,
  comments: GitHubGistComment[]
): void => {
  const list = section.querySelector<HTMLOListElement>('[data-comments-list]');
  const status = section.querySelector<HTMLElement>('[data-comments-status]');
  if (!list || !status) return;

  list.replaceChildren(...comments.map((comment) => renderComment(comment, section)));

  if (comments.length === 0) {
    status.textContent = section.dataset.labelEmpty || '';
    status.hidden = false;
    list.hidden = true;
  } else {
    status.hidden = true;
    list.hidden = false;
  }

  updateHeading(section, comments.length);
  section.setAttribute('aria-busy', 'false');
};

const showUnavailable = (section: HTMLElement): void => {
  const list = section.querySelector<HTMLOListElement>('[data-comments-list]');
  const status = section.querySelector<HTMLElement>('[data-comments-status]');
  if (list) list.hidden = true;
  if (status) {
    status.textContent = section.dataset.labelUnavailable || '';
    status.hidden = false;
  }
  section.setAttribute('aria-busy', 'false');
};

const loadComments = async (section: HTMLElement): Promise<void> => {
  const url = section.dataset.commentsUrl;
  if (!url) {
    showUnavailable(section);
    return;
  }

  const cacheKey = `classy:gist-comments:${section.dataset.gistId ?? url}`;
  const cached = readCache(cacheKey);
  if (cached) {
    renderComments(section, cached);
    return;
  }

  const status = section.querySelector<HTMLElement>('[data-comments-status]');
  if (status) {
    status.textContent = section.dataset.labelLoading || '';
    status.hidden = false;
  }

  try {
    // 只加 Accept（CORS 安全头），不触发预检，也不带任何 token。
    const response = await fetch(url, {
      headers: { accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
      throw new Error(`GitHub comments ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('GitHub comments payload is not an array');
    }

    const comments = payload.filter(isGistComment);
    writeCache(cacheKey, comments);
    renderComments(section, comments);
  } catch (error) {
    console.warn(
      '[classy] gist comments failed:',
      (error as Error).message
    );
    showUnavailable(section);
  }
};

export const initGistComments = (): void => {
  document
    .querySelectorAll<HTMLElement>('[data-gist-comments]')
    .forEach((section) => {
      void loadComments(section);
    });
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
