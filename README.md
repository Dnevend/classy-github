# ClassyGithub

<p align="center">
    <img src="https://raw.githubusercontent.com/Dnevend/classy-github/refs/heads/main/apps/classy/public/github.svg?sanitize=true"
        height="80">
</p>

<p align="center">
    无需部署登录，<a href="https://classygit.me/" target="_blank">即刻访问</a>你的定制 Github 主页、代码片段、个人博客、随笔集。
</p>

<p align="center">
    <img src="https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white&style=for-the-badge" alt="Vite">
    <img src="https://img.shields.io/badge/-ReactJs-61DAFB?logo=react&logoColor=white&style=for-the-badge" alt="ReactJs">
    <img src="https://img.shields.io/badge/-Cloudflare-F36F27?logo=cloudflare&logoColor=white&style=for-the-badge" alt="Cloudflare">
    <img src="https://img.shields.io/badge/-Hono-000000?logo=hono&logoColor=white&style=for-the-badge" alt="Hono">
</p>

## 📖 介绍

### 项目实现

- 本项目基于 [Github 公共 API](https://docs.github.com/en/rest)，获取公开数据，生成你的多种主题可定制的个性主页。

- 随笔/博客或者任何其他记录性质的文档，依赖于 [Github Gist](https://gist.github.com/)，通过自定义规则配置以实现分类展示。

- 项目仅依赖于 Github 并部署在 Cloudflare，同时通过 Cloudflare 的边缘服务处理了 Github API 的限流问题。

### 主要技术

- 前端：Vite + Monorepo + React + Tailwind CSS

- 服务：Github API + Hono

- 部署：Cloudflare

## 🚀 运行

```bash
git clone https://github.com/Dnevend/classy-github.git # 克隆项目

pnpm install # 安装依赖

pnpm run dev # 运行默认主题

pnpm run dev:[other] # 运行其他主题
```

## 🔧 配置

```json
// classygit.config.json
{
  "theme": "default",
  // 个人主页配置
  "profile": {
    "repos": {
      "visible": true, // 是否展示仓库
      "showCount": 6 // 展示仓库数量
    },
    "cover": "" // 封面（暂未使用）
  },
  // Gist 页配置
  "gists": {
    "prefix": "Classy", // 规则前缀
    "split": ".", // 分隔符
    "default": null, // 默认分类
    // 分类
    "type": [
      {
        "name": "blog"
      },
      {
        "name": "weekly"
      }
    ]
  },
  // 底部链接
  "links": [
    {
      "title": "Github",
      "href": "https://github.com/Dnevend/classy-github"
    },
    {
      "title": "Docs",
      "href": "https://docs.classygit.me"
    }
  ]
}
```

## 📝 TODO

- [ ] 使用 Next.js 重构，带来更好的 SEO 效果

- 多主题
  - [x] 经典主题
  - [ ] NES 复古主题
  - [ ] Mac 复古主题
