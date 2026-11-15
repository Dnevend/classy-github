import type { ThemeName } from '../lib/config';
import { parseThemeParam } from '../lib/theme';
import type { ThemeComponents } from './types';

/**
 * 主题注册表。
 *
 * 必须写成静态字面量映射：Astro/Vite 靠它做代码分割。
 * 用变量拼路径（`import(\`./${name}\`)`）会让所有主题打进同一个 chunk。
 */
const registry: Partial<Record<ThemeName, () => Promise<ThemeComponents>>> = {
  // default 已退役（代码保留在 ./default，不再注册）；mac 接管默认
  nes: () => import('./nes'),
  win98: () => import('./win95'),
  mac: () => import('./mac'),
  tui: () => import('./tui'),
};

export const availableThemes = Object.keys(registry) as ThemeName[];

export const isThemeAvailable = (name: ThemeName) => name in registry;

/**
 * 解析 `?theme=` 并加载对应主题；名字不存在时回退 default。
 */
export async function resolveTheme(param?: string | null): Promise<{
  name: ThemeName;
  components: ThemeComponents;
}> {
  const requested = parseThemeParam(param);
  const name = isThemeAvailable(requested) ? requested : 'mac';
  const loader = registry[name] ?? registry.mac;

  if (!loader) {
    throw new Error('主题注册表里缺少 mac 主题');
  }

  return { name, components: await loader() };
}
