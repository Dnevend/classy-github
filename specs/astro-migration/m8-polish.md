# M8 · 资料卡 / 详情页 / 分享 / 配置导航

> 日期：2026-11-15　分支：`v2`

## 1. 资料卡补齐信息（带图标）

新增 `themes/_shared/ProfileMeta.astro`：位置 / 公司 / 邮箱 / Twitter / 加入时间，
纯 SVG 图标（`currentColor`，跟随主题色），无数据的项自动隐藏。五套主题统一接入。
同时删掉了 default 主题里重复展示的 location。

## 2. 主页仓库卡指向站内详情

`/<user>` 的「最近更新」从跳 GitHub 改为跳 `/<user>/repo/<name>`，和仓库列表页一致。

## 3. 详情页返回

- 仓库详情：`← {user} 的仓库` → `/<user>/repos`
- Gist 详情：`← {user} 的 Gist` → `/<user>/gists`

## 4. 详情页分享卡片

`ShareCard` 从「只接受用户资料」改成通用结构：

```ts
interface ShareCardData { title; description?; handle; avatar?; url }
```

- 仓库详情：标题=仓库名，描述=仓库简介
- Gist 详情：标题=Gist 标题，描述=正文压平后截断 **50 字**
- 头像用 `https://github.com/<login>.png?size=160`（一次跳转，不消耗 API 配额，CORS 安全）

## 5. 右上角用户名固定

详情页之前把 `brand` 传成仓库名 / Gist 标题，导致页头跟着变。现在：
**页头永远显示用户显示名**，点击回主页；仓库名只出现在正文标题里。

## 6. 右侧空白的填充：语言分布

ProfileCard 下方加了**语言占比条**（按仓库数统计，取前 4 种，配 GitHub 官方语言色）：

```
[========蓝========][黄][深蓝][紫]
● TypeScript 70%   ● JavaScript 15%
● Python 10%       ● CSS 5%
```

数据来自主页已经拉取的仓库列表，**没有新增任何 API 请求**。
配合上面的 ProfileMeta，PC 端右侧不再是「一张卡 + 一片空」。

## 7. 没有简介的仓库卡

- meta 行加了**语言色点**和**最后更新时间**（`updated 2026-11-14`）
- meta 允许换行、每段不折行，避免「0」被挤到下一行
- 卡片靠 `flex` 让描述区占满剩余空间，没有描述时也不会塌成一条

## 8. 配置化：`nav.extra`

```json
"nav": {
  "extra": [{ "title": "About", "href": "https://example.com/about" }]
}
```

- 追加在 Repos / Gists 之后，最多 5 条
- 复用 `links` 的校验（title ≤ 64、href 必须 http(s)）
- 五套主题的导航都渲染

---

## 验证

```
astro check     0 errors（68 文件，7 hints 是部分卡片未用的 t）
生产构建        dist/server 3.3M
线上            /Dnevend · /repo/* · /gist/* · /repos?page=2 全部 200
视觉            PC 端右侧含图标元信息 + 语言条；仓库卡带语言色点与更新时间；
                详情页有返回链接、页头用户名固定、分享卡片标题为仓库名
```

## 遗留

- 详情页分享卡片的「描述截断 50 字」是纯文本截断，没有做省略号
- 语言条只统计当前页拉到的仓库（主页取 100 条），不是全量
- README 里第三方统计图仍是空白（上游服务问题），只是限了高度
