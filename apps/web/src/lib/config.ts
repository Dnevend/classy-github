import { z } from 'zod';
import { parseThemeName } from './theme.ts';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n.ts';

/**
 * 用户配置：`<user>/classy-github` 仓库根目录的 `classy.config.json`。
 *
 * 三条原则：
 * 1. **永不因为配置出错把站点打挂** —— 解析失败就退回默认值，并记 issue；
 * 2. **逐段降级** —— 某一段写错只影响那一段，不影响其余配置；
 * 3. **不信任外部输入** —— href 只放行 http(s)，未知字段直接丢弃。
 */

export type ThemeName = 'nes' | 'mac' | 'win98' | 'tui';

export interface ResolvedConfig {
  /**
   * 配置归属的 GitHub 登录名。
   * fork 会继承作者的配置；站点读到 owner 与当前用户不一致时，会把它当模板忽略。
   */
  owner: string | null;
  theme: ThemeName;
  /** 访客没有选择语言时的默认语言 */
  language: Locale;
  profile: {
    cover: string | null;
    /** 可选：嵌入任意第三方统计卡图片（http/https） */
    cardUrl: string | null;
    repos: {
      visible: boolean;
      showCount: number;
    };
    /** 主页右侧的「最近 Gists」预览（不是 gists 分类规则） */
    gists: {
      visible: boolean;
      showCount: number;
    };
  };
  gists: {
    prefix: string;
    split: string;
    default: string | null;
    type: { name: string }[];
  };
  links: { title: string; href: string }[];
  nav: {
    /** 额外导航项（外链），追加在 Repos / Gists 之后 */
    extra: { title: string; href: string }[];
  };
  /** 资料卡下方的「近况」：在读 / 在听 / 在看 */
  now: {
    books: string[];
    music: string[];
    watching: string[];
  };
  /** 用一条公开 Gist 的评论做留言簿；null 表示关闭 */
  guestbook: {
    gistId: string | null;
  };
  /** 是否加入 ClassyGit 网站环 */
  webring: {
    enabled: boolean;
  };
  /** 是否允许出现在 /random 随机推荐里 */
  discover: {
    enabled: boolean;
  };
  seo: {
    /** 是否允许搜索引擎收录这个人的主页 */
    index: boolean;
  };
}

/** owner 为空视为旧配置；有值时必须与当前用户一致（大小写不敏感） */
export const isConfigForUser = (
  config: Pick<ResolvedConfig, 'owner'>,
  user: string
): boolean =>
  !config.owner || config.owner.toLowerCase() === user.toLowerCase();

export const DEFAULT_CONFIG: ResolvedConfig = {
  owner: null,
  theme: 'mac',
  language: DEFAULT_LOCALE,
  profile: {
    cover: null,
    cardUrl: null,
    repos: { visible: true, showCount: 6 },
    gists: { visible: true, showCount: 6 },
  },
  gists: {
    prefix: 'classy',
    split: '.',
    default: null,
    type: [{ name: 'blog' }, { name: 'code' }],
  },
  links: [],
  nav: { extra: [] },
  now: { books: [], music: [], watching: [] },
  guestbook: { gistId: null },
  webring: { enabled: true },
  discover: { enabled: true },
  seo: { index: false },
};

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value);

/** 每段都用「全 optional」的 schema，目的是让 `{}` 合法、缺失字段走默认值 */
const previewListSchema = z
  .object({
    visible: z.boolean(),
    // 取值范围在归一化时再夹紧：越界数字不应该让整段配置作废
    showCount: z.number(),
  })
  .partial();

const profileSchema = z
  .object({
    cover: z.string().refine(isHttpUrl, 'cover 必须是 http(s) URL').nullable(),
    cardUrl: z.string().refine(isHttpUrl, 'cardUrl 必须是 http(s) URL').nullable(),
    repos: previewListSchema,
    gists: previewListSchema,
  })
  .partial();

const gistsSchema = z
  .object({
    prefix: z.string().min(1),
    split: z.string().min(1),
    default: z.string().nullable(),
    type: z.array(z.object({ name: z.string().min(1) })).min(1),
  })
  .partial();

const linkSchema = z.object({
  title: z.string().min(1).max(64),
  href: z.string().refine(isHttpUrl, 'href 必须是 http(s) URL'),
});

const seoSchema = z.object({ index: z.boolean() }).partial();

const stringList = z.array(z.string().min(1).max(80)).max(8);

const nowSchema = z
  .object({
    books: stringList,
    music: stringList,
    watching: stringList,
  })
  .partial();

const navSchema = z
  .object({
    extra: z.array(linkSchema).max(5),
  })
  .partial();

const guestbookSchema = z
  .object({
    // Gist ID 是 20–40 位十六进制；允许显式 null 关闭
    gistId: z.string().regex(/^[a-f0-9]{20,40}$/i).nullable(),
  })
  .partial();

const toggleSchema = z.object({ enabled: z.boolean() }).partial();

const languageSchema = z.enum(LOCALES);
const ownerSchema = z.string().regex(/^[a-z\d](?:[a-z\d-]{0,38})$/i);

const rootSchema = z
  .object({
    owner: z.string(),
    theme: z.string(),
    language: z.string(),
    profile: z.unknown(),
    gists: z.unknown(),
    links: z.unknown(),
    nav: z.unknown(),
    now: z.unknown(),
    guestbook: z.unknown(),
    webring: z.unknown(),
    discover: z.unknown(),
    seo: z.unknown(),
  })
  .partial();

const MAX_PREVIEW_COUNT = 100;

const clampCount = (value: number | undefined, fallback: number) => {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(MAX_PREVIEW_COUNT, Math.max(0, Math.floor(value)));
};

const pick = <T>(schema: z.ZodType<T>, value: unknown): T | null => {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
};

const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`);

export interface ParseConfigResult {
  config: ResolvedConfig;
  issues: string[];
}

/**
 * 纯函数：把任意 JSON 变成可用配置。
 * 单独导出是为了能在 node 里直接跑断言（见 scripts/config-smoke.ts）。
 */
export const parseConfig = (input: unknown): ParseConfigResult => {
  const issues: string[] = [];

  if (input !== null && typeof input !== 'object') {
    return { config: DEFAULT_CONFIG, issues: ['<root>: 配置必须是一个对象'] };
  }

  const root = rootSchema.safeParse(input ?? {});
  if (!root.success) {
    return { config: DEFAULT_CONFIG, issues: formatIssues(root.error) };
  }

  const raw = root.data;

  let owner: string | null = null;
  if (raw.owner !== undefined) {
    const parsedOwner = pick(ownerSchema, raw.owner);
    if (parsedOwner) {
      owner = parsedOwner;
    } else {
      issues.push(`owner: "${raw.owner}" 不是合法 GitHub 用户名，已忽略`);
    }
  }

  let theme: ThemeName = DEFAULT_CONFIG.theme;
  if (raw.theme !== undefined) {
    const parsedTheme = parseThemeName(raw.theme);
    if (parsedTheme) {
      theme = parsedTheme;
    } else {
      issues.push(`theme: 未知主题 "${raw.theme}"，已回退为 ${DEFAULT_CONFIG.theme}`);
    }
  }

  const language = raw.language === undefined ? DEFAULT_LOCALE : pick(languageSchema, raw.language);
  if (raw.language !== undefined && language === null) {
    issues.push(`language: 不支持 "${raw.language}"，已回退为 ${DEFAULT_LOCALE}`);
  }

  const profile = pick(profileSchema, raw.profile);
  if (raw.profile !== undefined && profile === null) {
    issues.push('profile: 结构不合法，已忽略该段');
  }

  const gists = pick(gistsSchema, raw.gists);
  if (raw.gists !== undefined && gists === null) {
    issues.push('gists: 结构不合法，已忽略该段');
  }

  const nav = pick(navSchema, raw.nav);
  if (raw.nav !== undefined && nav === null) {
    issues.push('nav: 结构不合法，已忽略该段');
  }

  const now = pick(nowSchema, raw.now);
  if (raw.now !== undefined && now === null) {
    issues.push('now: 结构不合法，已忽略该段');
  }

  const guestbook = pick(guestbookSchema, raw.guestbook);
  if (raw.guestbook !== undefined && guestbook === null) {
    issues.push('guestbook: 结构不合法，已忽略该段');
  }

  const webring = pick(toggleSchema, raw.webring);
  if (raw.webring !== undefined && webring === null) {
    issues.push('webring: 结构不合法，已忽略该段');
  }

  const discover = pick(toggleSchema, raw.discover);
  if (raw.discover !== undefined && discover === null) {
    issues.push('discover: 结构不合法，已忽略该段');
  }

  const seo = pick(seoSchema, raw.seo);
  if (raw.seo !== undefined && seo === null) {
    issues.push('seo: 结构不合法，已忽略该段');
  }

  // links 逐条校验：坏的丢一条，不是整段作废
  const links: { title: string; href: string }[] = [];
  if (raw.links !== undefined) {
    if (!Array.isArray(raw.links)) {
      issues.push('links: 必须是数组，已忽略');
    } else {
      raw.links.forEach((item, index) => {
        const parsed = linkSchema.safeParse(item);
        if (parsed.success) links.push(parsed.data);
        else issues.push(`links[${index}]: 已丢弃（${formatIssues(parsed.error).join('; ')}）`);
      });
    }
  }

  const parsedProfile = profile ?? {};
  const parsedRepos = parsedProfile.repos ?? {};
  const parsedProfileGists = parsedProfile.gists ?? {};

  return {
    issues,
    config: {
      owner,
      theme,
      language: language ?? DEFAULT_LOCALE,
      profile: {
        cover: parsedProfile.cover ?? DEFAULT_CONFIG.profile.cover,
        cardUrl: parsedProfile.cardUrl ?? DEFAULT_CONFIG.profile.cardUrl,
        repos: {
          visible: parsedRepos.visible ?? DEFAULT_CONFIG.profile.repos.visible,
          showCount: clampCount(
            parsedRepos.showCount,
            DEFAULT_CONFIG.profile.repos.showCount
          ),
        },
        gists: {
          visible:
            parsedProfileGists.visible ?? DEFAULT_CONFIG.profile.gists.visible,
          showCount: clampCount(
            parsedProfileGists.showCount,
            DEFAULT_CONFIG.profile.gists.showCount
          ),
        },
      },
      gists: {
        prefix: gists?.prefix ?? DEFAULT_CONFIG.gists.prefix,
        split: gists?.split ?? DEFAULT_CONFIG.gists.split,
        default: gists?.default ?? DEFAULT_CONFIG.gists.default,
        type: gists?.type ?? DEFAULT_CONFIG.gists.type,
      },
      links,
      nav: { extra: nav?.extra ?? DEFAULT_CONFIG.nav.extra },
      now: {
        books: now?.books ?? [],
        music: now?.music ?? [],
        watching: now?.watching ?? [],
      },
      guestbook: {
        gistId: guestbook?.gistId ?? DEFAULT_CONFIG.guestbook.gistId,
      },
      webring: {
        enabled: webring?.enabled ?? DEFAULT_CONFIG.webring.enabled,
      },
      discover: {
        enabled: discover?.enabled ?? DEFAULT_CONFIG.discover.enabled,
      },
      seo: { index: seo?.index ?? DEFAULT_CONFIG.seo.index },
    },
  };
};
