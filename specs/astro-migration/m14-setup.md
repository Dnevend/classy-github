# M14 · 配置生成器 `/setup`

> 日期：2026-11-16　分支：`v2`

## 范围

- `/setup`：输入 GitHub 用户名，进入配置生成器。
- `/setup?u=<user>`：表单 + 实时 JSON + 主题/语言 iframe 预览 + 复制/发布入口。
- 表单字段：主题、语言、最近仓库数、关注者/关注中开关、页脚链接（可增删）、
  近况（在读/在听/在看）、留言簿 Gist ID、网站环 / 随机推荐、SEO 收录。
- 从用户当前配置预填；`cover` / `cardUrl` / `gists` / `nav` 等未暴露字段原样保留。
- 预览 iframe 带 `preview=1`，不写主题/语言 cookie。
- 未配置用户可使用；已配置用户进入后会看到自己的当前值。

## 实现

- `pages/setup.astro`：服务端 `loadUser` + `loadConfigState` + `getDefaultBranch`
  （决定是否显示「在我的 fork 里编辑」）；无用户名时只渲染入口表单。
- 客户端表单用 `input`/`change` 重建 JSON；链接行可增删；复制用 Clipboard API。
- `setup-initial` JSON 用 `set:html` 注入，`<` 转成 `\\u003c`，避免 `</script>` 截断。
- **缓存修复**：`/setup` 是单段路径，原本会命中通用 `/[user]` 缓存；
  现在 `SKIP_CACHE` 排除 `setup` / `random` / `robots.txt` / `sitemap` / `api`，
  否则 `?u=` 会被无参数页面缓存污染。
- **预览 cookie**：middleware 在 `preview=1` 时跳过主题和语言 cookie，
  避免 iframe 预览改写访客偏好。

## 验证

- `/setup` → 200，显示用户名入口。
- `/setup?u=Dnevend` → 200，表单预填当前配置；`/setup?u=antfu` → 200，
  无 fork 时只显示 Fork，不显示 Edit。
- Playwright：改 theme/language/showCount/guestbook/webring 后 JSON 立即变化，
  `links` 可新增到 3 条，预览 iframe `src` 更新为 `?theme=nes&lang=zh&preview=1`；
  桌面 1280px 下表单/输出两列（429px + 429px）。
- `curl -D` `/Dnevend?theme=nes&lang=zh&preview=1` → 无 `Set-Cookie`；
  普通 `?theme=nes` 仍有 cookie。
- `pnpm test` / `pnpm check` / `pnpm build` 通过。
- 生产部署与 CI 待补。

## 已知限制

- 预览只反映主题和语言；链接/近况/开关要保存配置后才出现在真实页面。
- 不直接提交 GitHub：需要用户复制 JSON 到 fork，或点 Fork / Edit 链接手动粘贴。
- `cover` / `cardUrl` / Gist 规则是只读保留，不在表单里编辑。
- 无 OAuth；这是「不登录」路线的取舍。
