import type { ThemeName } from './config.ts';
import type { ThemePalette } from './theme-palette.ts';

export interface OgCardInput {
  login: string;
  name?: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  stars: number;
  theme: ThemeName;
  palette: ThemePalette;
  host: string;
  /** data: URL；null 表示头像拉取失败 */
  avatar: string | null;
  /** data: URL；null 表示没有封面，或封面格式不被 Satori 支持 */
  cover: string | null;
}

/** 只用 ASCII 的名字才上卡片：避免把中文字体打进 Worker */
export const asciiName = (name: string | null | undefined, login: string) => {
  const value = name?.trim();
  if (!value) return login;
  return /^[\x20-\x7E]+$/.test(value) && value.length <= 28 ? value : login;
};

/**
 * 1200×630 社交卡片的 HTML（Satori / workers-og 输入）。
 *
 * 注意：Satori 的 `background-image` 只认 gradient 和 `url()`，
 * 传 `none` 会直接抛 `Invalid background image`。没有封面时必须**省略**
 * 整个属性，而不是写成 `none`。
 */
export const buildOgCardHtml = ({
  login,
  name,
  publicRepos,
  publicGists,
  followers,
  stars,
  theme,
  palette,
  host,
  avatar,
  cover,
}: OgCardInput): string => {
  const hasCover = Boolean(cover);
  const fg = hasCover ? '#ffffff' : palette.fg;
  const muted = hasCover ? 'rgba(255,255,255,0.78)' : palette.muted;
  const line = hasCover ? 'rgba(255,255,255,0.32)' : palette.border;
  const statBg = hasCover ? 'rgba(8,10,14,0.48)' : palette.bg;
  const statValue = hasCover ? '#ffffff' : palette.accent;
  const badgeBg = hasCover ? '#ffffff' : palette.accent;
  const badgeFg = hasCover ? '#111111' : palette.bg;
  const avatarBorder = hasCover ? 'rgba(255,255,255,0.9)' : palette.border;

  const coverStyle = hasCover
    ? `background-image:url(${cover});background-size:cover;background-position:center;`
    : '';
  const overlayStyle = hasCover
    ? 'background:linear-gradient(180deg,rgba(4,5,8,0.16) 0%,rgba(4,5,8,0.52) 44%,rgba(4,5,8,0.88) 100%);'
    : '';

  const display = asciiName(name, login);

  const stat = (value: number, label: string) => `
    <div style="display:flex;flex:1;flex-direction:column;gap:4px;padding:16px 22px;border:2px solid ${line};background:${statBg};min-width:0;">
      <div style="display:flex;font-size:44px;line-height:1;font-weight:700;color:${statValue};">${value}</div>
      <div style="display:flex;font-size:19px;letter-spacing:0.08em;text-transform:uppercase;color:${muted};">${label}</div>
    </div>`;

  return `
  <div style="position:relative;display:flex;flex-direction:column;width:1200px;height:630px;box-sizing:border-box;overflow:hidden;background-color:${palette.bg};${coverStyle}color:${fg};border:12px solid ${palette.border};font-family:'ClassyOG',sans-serif;">
    <div style="position:relative;display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;padding:42px 52px;${overlayStyle}">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${line};padding-bottom:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="display:flex;width:32px;height:32px;align-items:center;justify-content:center;background:${badgeBg};color:${badgeFg};font-size:17px;font-weight:700;">CG</div>
          <div style="display:flex;font-size:27px;font-weight:700;letter-spacing:0.04em;">ClassyGit</div>
        </div>
        <div style="display:flex;font-size:21px;letter-spacing:0.12em;text-transform:uppercase;color:${muted};">${theme.toUpperCase()} / 1984</div>
      </div>

      <div style="display:flex;align-items:flex-end;gap:28px;margin-top:30px;">
        ${
          avatar
            ? `<img src="${avatar}" width="128" height="128" style="width:128px;height:128px;border-radius:64px;border:4px solid ${avatarBorder};" />`
            : `<div style="display:flex;width:128px;height:128px;border-radius:64px;background:${badgeBg};"></div>`
        }
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0;padding-bottom:4px;">
          <div style="display:flex;font-size:56px;line-height:1.05;font-weight:700;overflow:hidden;white-space:nowrap;">${display}</div>
          <div style="display:flex;font-size:27px;color:${muted};">@${login}</div>
        </div>
      </div>

      <div style="display:flex;gap:14px;margin-top:28px;">
        ${stat(publicRepos, 'repos')}
        ${stat(stars, 'stars')}
        ${stat(publicGists, 'gists')}
        ${stat(followers, 'followers')}
      </div>

      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;border-top:3px solid ${line};padding-top:18px;">
        <div style="display:flex;font-size:21px;color:${muted};">No deploy. No login. Just GitHub.</div>
        <div style="display:flex;font-size:19px;color:${muted};">${host}/${login}</div>
      </div>
    </div>
  </div>`;
};
