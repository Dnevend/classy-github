# ClassyGithub

无需部署登录，[即刻访问](https://classygit.me/)你的定制 Github 主页、代码片段、个人博客、随笔集。

## 介绍

- 本项目基于 [Github 公共 API](https://docs.github.com/en/rest)，获取公开数据，生成你的多种主题可定制的个性主页。

- 随笔/博客或者任何其他记录性质的文档，依赖于 [Github Gist](https://gist.github.com/)，通过自定义规则配置以实现分类展示。

## 配置

```json classygit.config.json
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

## TODO:

- 主题
  - [x] 经典主题
  - [ ] NES 复古主题
  - [ ] Mac 复古主题
- [ ] 使用 Next.js 重构
- [ ] SEO 优化
