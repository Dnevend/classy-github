import { z } from 'zod';
import { isThemeName } from './theme.ts';

/**
 * 用户配置：`<user>/classy-github` 仓库根目录的 `classy.config.json`。
 *
 * 三条原则：
 * 1. **永不因为配置出错把站点打挂** —— 解析失败就退回默认值，并记 issue；
 * 2. **逐段降级** —— 某一段写错只影响那一段，不影响其余配置；
 * 3. **不信任外部输入** —— href 只放行 http(s)，未知字段直接丢弃。
 */

export type ThemeName = 'default' | 'nes' | 'mac' | 'win95' | 'tui';

export interface ResolvedConfig {
  theme: ThemeName;
  profile: {
    cover: string | null;
    showFollowers: boolean;
    showFollowing: boolean;
    repos: {
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
  seo: {
    /** 是否允许搜索引擎收录这个人的主页 */
    index: boolean;
  };
}

export const DEFAULT_CONFIG: ResolvedConfig = {
  theme: 'default',
  profile: {
    cover: null,
    showFollowers: true,
    showFollowing: true,
    repos: { visible: true, showCount: 6 },
  },
  gists: {
    prefix: 'classy',
    split: '.',
    default: null,
    type: [{ name: 'blog' }, { name: 'code' }],
  },
  links: [],
  seo: { index: false },
};

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value);

/** 每段都用「全 optional」的 schema，目的是让 `{}` 合法、缺失字段走默认值 */
const reposSchema = z
  .object({
    visible: z.boolean(),
    // 取值范围在归一化时再夹紧：越界数字不应该让整段配置作废
    showCount: z.number(),
  })
  .partial();

const profileSchema = z
  .object({
    cover: z.string().refine(isHttpUrl, 'cover 必须是 http(s) URL'),
    showFollowers: z.boolean(),
    showFollowing: z.boolean(),
    repos: reposSchema,
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

const rootSchema = z
  .object({
    theme: z.string(),
    profile: z.unknown(),
    gists: z.unknown(),
    links: z.unknown(),
    seo: z.unknown(),
  })
  .partial();

const MAX_REPO_CARDS = 100;

const clampCount = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_CONFIG.profile.repos.showCount;
  }
  return Math.min(MAX_REPO_CARDS, Math.max(0, Math.floor(value)));
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

  let theme: ThemeName = DEFAULT_CONFIG.theme;
  if (raw.theme !== undefined) {
    if (isThemeName(raw.theme)) {
      theme = raw.theme;
    } else {
      issues.push(`theme: 未知主题 "${raw.theme}"，已回退为 default`);
    }
  }

  const profile = pick(profileSchema, raw.profile);
  if (raw.profile !== undefined && profile === null) {
    issues.push('profile: 结构不合法，已忽略该段');
  }

  const gists = pick(gistsSchema, raw.gists);
  if (raw.gists !== undefined && gists === null) {
    issues.push('gists: 结构不合法，已忽略该段');
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

  return {
    issues,
    config: {
      theme,
      profile: {
        cover: parsedProfile.cover ?? DEFAULT_CONFIG.profile.cover,
        showFollowers:
          parsedProfile.showFollowers ?? DEFAULT_CONFIG.profile.showFollowers,
        showFollowing:
          parsedProfile.showFollowing ?? DEFAULT_CONFIG.profile.showFollowing,
        repos: {
          visible: parsedRepos.visible ?? DEFAULT_CONFIG.profile.repos.visible,
          showCount: clampCount(parsedRepos.showCount),
        },
      },
      gists: {
        prefix: gists?.prefix ?? DEFAULT_CONFIG.gists.prefix,
        split: gists?.split ?? DEFAULT_CONFIG.gists.split,
        default: gists?.default ?? DEFAULT_CONFIG.gists.default,
        type: gists?.type ?? DEFAULT_CONFIG.gists.type,
      },
      links,
      seo: { index: seo?.index ?? DEFAULT_CONFIG.seo.index },
    },
  };
};
