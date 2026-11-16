import type { SiteRecord } from './site-registry.ts';

export interface SiteSummary {
  login: string;
  title: string;
  theme: string;
}

export interface RingNeighbors {
  member: boolean;
  count: number;
  prev?: SiteSummary;
  next?: SiteSummary;
  random?: SiteSummary;
}

const summary = (site: SiteRecord): SiteSummary => ({
  login: site.login,
  title: site.title,
  theme: site.theme,
});

/**
 * 计算网站环的上一站 / 下一站 / 随机站。
 * 纯函数：传入 0–1 的随机数便于在 node 里断言。
 */
export const pickNeighbors = (
  sites: SiteRecord[],
  login: string,
  randomValue = Math.random()
): RingNeighbors => {
  const sorted = [...sites].sort((a, b) => a.login.localeCompare(b.login));
  const index = sorted.findIndex(
    (site) => site.login.toLowerCase() === login.toLowerCase()
  );

  if (index === -1) return { member: false, count: sorted.length };

  const current = sorted[index];
  const count = sorted.length;

  if (count < 2) return { member: true, count };

  const prev = sorted[(index - 1 + count) % count];
  const next = sorted[(index + 1) % count];

  const randomIndex = Math.min(
    count - 1,
    Math.max(0, Math.floor(randomValue * count))
  );
  let random = sorted[randomIndex];

  // 随机到自己时顺延一个，保证「随机」真的能逛到别人家
  if (random.login === current.login) {
    random = sorted[(randomIndex + 1) % count];
  }

  return {
    member: true,
    count,
    prev: summary(prev),
    next: summary(next),
    random: summary(random),
  };
};
