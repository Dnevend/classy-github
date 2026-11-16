# M17 · fork 配置隔离 / 默认 README / 右栏对齐

> 日期：2026-11-16　分支：`main`

## 范围

1. **fork 继承作者配置**：`classy.config.json` 新增 `owner`；owner 与当前用户不一致时，
   配置被视为作者模板并忽略（使用默认值、`configured:false`，显示 claim 横幅）。
2. **没有 profile README**：用户主页显示默认可编辑的 README 模板
   （`src/templates/profile-readme.{en,zh}.ts`）。
3. **右栏资料卡对齐**：Base 量出实际 header 高度写入 `--classy-header-offset`，
   右栏 sticky 使用这个变量而不是写死 84px，使左右两栏从同一高度开始。

## 实现

### owner

- `ResolvedConfig.owner: string | null`，zod 校验 GitHub login。
- `isConfigForUser(config, user)` 纯函数：owner 为空视为旧配置；有值必须大小写不敏感匹配。
- `loadConfigState` owner 不匹配时返回 `DEFAULT_CONFIG / configured:false / source:'template'`，
  同时跳过 webring 同步、显示 claim。
- 根 `classy.config.json` 写 `"owner": "Dnevend"`；`/setup` 和 `/claim` 生成的配置
  自动写当前用户为 owner。
- README 增加 owner 字段说明和「fork 后记得改 owner」。

### 默认 README

- `templates/profile-readme.en.ts` / `.zh.ts` 存 Markdown 字符串。
- `buildDefaultReadme()` 替换 `{{name}}/{{login}}/{{repos}}/{{gists}}/{{setup}}`，
  并对显示名做 Markdown 转义。
- 用户主页：有 profile README 用它；没有就用模板渲染。
- 模板提示用户可以用 `<login>/<login>` 仓库的 README 替换，或去 `/setup` 定制。

### 右栏对齐

- 原因：`.profile__aside-wrap { position:sticky; top:84px }` 在 Mac（header 31px）
  等主题下会把右栏下推，左栏 top=45，右栏 top=84。
- 修复：Base 脚本读取页面实际 `<header>` 的 `offsetTop + offsetHeight`，写到
  `--classy-header-offset`；右栏 `top: var(--classy-header-offset, 0px)`。
  NES / TUI / Win98 也各自量到 68 / 50 / 51px，不再依赖写死值。

## 验证

- `pnpm test`：config smoke 16 项（含 owner/isConfigForUser）；community smoke 13 项
  （含默认 README 中英模板）；`pnpm check` / `pnpm build` 通过。
- 本地 `/torvalds`（无 profile README）显示：
  `Hi, I'm Linus Torvalds 👋` + 默认 README 说明 + 定制链接。
- Playwright 1280px：Mac / NES / Win98 / TUI 四套主题的
  `.profile__aside-wrap.top - .profile__main.top` 均为 `0`；
  header offset 分别为 31 / 68 / 51 / 50px。
- 所有主题的右栏 sticky 只用真实 header 高度，不再有 Mac 上 19–39px 的错位。
- 生产部署与 CI 待补。

## 已知限制

- 已经 fork 但配置里没有 `owner` 的旧 fork 仍会被接受；需要用户补 owner 或重新用 `/setup`。
- owner 不匹配时整份配置被忽略，而不是逐字段过滤；这是有意的安全默认值。
- 默认 README 是普通 Markdown 渲染，不区分未配置/已配置状态。
