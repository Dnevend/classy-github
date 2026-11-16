import { paletteFor } from './theme-palette.ts';

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[
        char
      ] ?? char
  );

/** 88×31 复古徽章；纯函数，方便在 node 里断言 */
export const renderBadgeSvg = (
  user: string,
  theme?: string | null
): string => {
  const colors = paletteFor(theme);
  // 88px 宽、左右各 5px 内边距；8px 等宽字体下约能放 16 个字符。
  // 超长 login 用省略号，而不是 textLength 强行压扁字形。
  const login = user.length > 15 ? `${user.slice(0, 14)}…` : user;
  const handle = escapeXml(`@${login}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="31" viewBox="0 0 88 31" role="img" aria-label="ClassyGit ${escapeXml(user)}">
  <rect width="88" height="31" fill="${colors.bg}"/>
  <rect x="0.5" y="0.5" width="87" height="30" fill="none" stroke="${colors.border}"/>
  <rect x="3" y="3" width="82" height="25" fill="none" stroke="${colors.border}" opacity="0.35"/>
  <text x="5" y="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="6.5" font-weight="700" letter-spacing="0.6" fill="${colors.accent}">CLASSYGIT</text>
  <text x="5" y="23" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" fill="${colors.fg}">${handle}</text>
</svg>`;
};
