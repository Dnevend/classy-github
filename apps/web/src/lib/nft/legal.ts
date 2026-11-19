export interface LegalSection {
  title: string;
  body: readonly string[];
}

export interface LegalPageCopy {
  title: string;
  lead: string;
  updated: string;
  sections: readonly LegalSection[];
}

export interface LegalCopy {
  privacy: LegalPageCopy;
  terms: LegalPageCopy;
  back: string;
}

const en: LegalCopy = {
  privacy: {
    title: 'Privacy',
    lead: 'What ClassyGit Pass stores, and what it does not.',
    updated: 'Last updated: 2026-11-19',
    sections: [
      {
        title: 'GitHub sign-in',
        body: [
          'Sign-in uses GitHub OAuth. We read your public profile: numeric id, login and account creation date. We do not request email addresses, repositories, gists or other private data.',
          'The OAuth client secret and the session signing key stay on the server. The browser receives only a short-lived, signed session cookie.',
        ],
      },
      {
        title: 'Eligibility check',
        body: [
          'To confirm that you own a ClassyGit site, we read the public <login>/classy-github repository and its classy.config.json through the GitHub API. The owner field must match your GitHub login.',
          'Stars, forks and other repositories are not read for eligibility.',
        ],
      },
      {
        title: 'What we store off-chain',
        body: [
          'Cloudflare KV stores the GitHub numeric id and login, the receiving wallet address, the chosen theme, the claim key and deadline, and after confirmation the token id, serial and transaction hash.',
          'We do not write IP addresses to KV or application logs. Rate-limit counters may use a key derived from the IP for up to 60 seconds inside Cloudflare.',
          'Session and OAuth state cookies are HttpOnly, SameSite=Lax, and expire after 15 and 10 minutes. The NFT pages do not load third-party analytics.',
          'A functional language cookie (classy_lang) remembers your language preference. It is HttpOnly, SameSite=Lax, and expires after one year.',
        ],
      },
      {
        title: 'What is public on-chain',
        body: [
          'The NFT is a public ERC-721 token on Base. The receiving wallet address, theme, serial and transaction are public. The token metadata does not contain your GitHub login or numeric id.',
          'Blockchain data is permanent and cannot be deleted by us. Off-chain claim records can be removed on request, except where needed to prevent abuse or comply with the law.',
        ],
      },
      {
        title: 'Service providers',
        body: [
          'GitHub (OAuth and public API), Cloudflare (hosting, KV and rate limiting), Base RPC providers, and Pinata/IPFS for card images. A gas relayer may submit the mint transaction on your behalf; it receives the wallet address and claim data, never your GitHub token.',
        ],
      },
      {
        title: 'Contact',
        body: [
          'Privacy questions or deletion requests: open an issue at github.com/Dnevend/classy-github.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms',
    lead: 'The short version: this is a free commemorative collectible, not an investment.',
    updated: 'Last updated: 2026-11-19',
    sections: [
      {
        title: 'Free commemorative item',
        body: [
          'ClassyGit Pass is free to claim. It has no mint price, no promised financial value and no expectation of return. It is not a security, share or investment product.',
        ],
      },
      {
        title: 'Eligibility and limits',
        body: [
          'You need a GitHub account at least 90 days old and a public <login>/classy-github repository whose classy.config.json owner matches your login. One card per theme per GitHub account, up to four cards.',
          'Each card may be sent to any EVM wallet, but the receiving wallet must sign the claim message. The same wallet may receive cards from different GitHub accounts.',
        ],
      },
      {
        title: 'Transfers and custody',
        body: [
          'Cards are transferable ERC-721 tokens on Base. You control the receiving wallet; we cannot recover a lost wallet, a lost seed phrase or a transfer sent to the wrong address.',
          'The card is a collectible. Treat it as such, and do not pay more for it than you are willing to lose.',
        ],
      },
      {
        title: 'Gas and relayer',
        body: [
          'Gas may be sponsored while the relayer is available and within its limits. If sponsorship is unavailable, your wallet pays the network fee. Sponsorship is best-effort and can be paused or removed at any time.',
        ],
      },
      {
        title: 'Metadata and contract risk',
        body: [
          'Token metadata is generated on-chain and references images on IPFS. The contract owner may update an image or collection URI to repair a broken link. Blockchain and smart-contract risks apply, including bugs, congestion and wallet failures.',
        ],
      },
      {
        title: 'Fair use',
        body: [
          'Do not use bots, multiple accounts, exploits or other abuse to obtain cards or to disrupt the service. We may pause minting, deny a claim or invalidate a pending voucher when needed to protect the campaign or other users.',
        ],
      },
      {
        title: 'No warranty',
        body: [
          'The service and the card are provided as-is, without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect or consequential losses arising from use of the service or the card.',
        ],
      },
      {
        title: 'Contact',
        body: [
          'Questions: open an issue at github.com/Dnevend/classy-github. These terms are not legal advice; the project may update them as the campaign evolves.',
        ],
      },
    ],
  },
  back: 'Back to overview',
};

const zh: LegalCopy = {
  privacy: {
    title: '隐私说明',
    lead: 'ClassyGit Pass 会保存什么，不会保存什么。',
    updated: '最后更新：2026-11-19',
    sections: [
      {
        title: 'GitHub 登录',
        body: [
          '登录使用 GitHub OAuth，只读取公开资料：数字 id、登录名和账号创建时间。不请求邮箱、仓库、Gist 或其他私有数据。',
          'OAuth client secret 和 session 签名密钥只保存在服务端；浏览器只拿到短期、签名的 session cookie。',
        ],
      },
      {
        title: '资格检查',
        body: [
          '为了确认你拥有 ClassyGit 站点，我们通过 GitHub API 读取公开的 <login>/classy-github 仓库及其 classy.config.json，owner 必须与你的 GitHub 登录名一致。',
          '资格检查不读取 star、fork 或其他仓库。',
        ],
      },
      {
        title: '链下保存的数据',
        body: [
          'Cloudflare KV 保存 GitHub 数字 id 与登录名、收款钱包地址、主题、claimKey 与 deadline；确认后保存 tokenId、序号和交易哈希。',
          '我们不把 IP 写入 KV 或应用日志。限流计数器最多在 Cloudflare 内使用基于 IP 的 key 60 秒。',
          'Session 与 OAuth state cookie 为 HttpOnly、SameSite=Lax，分别 15 分钟和 10 分钟过期。NFT 页面不加载第三方分析脚本。',
          '功能性语言 cookie（classy_lang）用于记住你的语言偏好，HttpOnly、SameSite=Lax，有效期一年。',
        ],
      },
      {
        title: '链上公开的数据',
        body: [
          'NFT 是 Base 上的公开 ERC-721。收款钱包地址、主题、序号和交易公开；token 元数据不包含 GitHub 登录名或数字 id。',
          '区块链数据是永久的，我们无法删除。链下领取记录可以应请求删除，但防止滥用或遵守法律所需的部分除外。',
        ],
      },
      {
        title: '服务提供方',
        body: [
          'GitHub（OAuth 与公开 API）、Cloudflare（托管、KV、限流）、Base RPC 提供方，以及 Pinata/IPFS（卡片图片）。gas relayer 可能代你提交 mint 交易，它只会收到钱包地址和领取数据，不会收到 GitHub token。',
        ],
      },
      {
        title: '联系',
        body: ['隐私问题或删除请求：在 github.com/Dnevend/classy-github 提 issue。'],
      },
    ],
  },
  terms: {
    title: '条款',
    lead: '一句话版本：这是免费纪念收藏品，不是投资品。',
    updated: '最后更新：2026-11-19',
    sections: [
      {
        title: '免费纪念品',
        body: [
          'ClassyGit Pass 免费领取，没有 mint 价格，不承诺金融价值或回报，也不是证券、股份或投资产品。',
        ],
      },
      {
        title: '资格与限制',
        body: [
          '需要满 90 天的 GitHub 账号，以及一个公开的 <login>/classy-github 仓库，classy.config.json 的 owner 与登录名一致。每个 GitHub 账号每个主题一张，最多四张。',
          '每张卡可以发给任意 EVM 钱包，但收款钱包必须签署领取消息。同一个钱包可以接收不同 GitHub 账号的卡。',
        ],
      },
      {
        title: '转让与保管',
        body: [
          '卡片是 Base 上可转让的 ERC-721。收款钱包由你控制；钱包丢失、助记词丢失或转错地址，我们都无法找回。',
          '这是收藏品，请只把它当作收藏品，不要支付超过你可承受损失的价格。',
        ],
      },
      {
        title: 'Gas 与代付',
        body: [
          'relayer 可用且在限额内时，gas 可能由项目代付；代付不可用时由你的钱包支付网络费。代付是尽力而为，可能随时暂停或取消。',
        ],
      },
      {
        title: '元数据与合约风险',
        body: [
          'token 元数据在链上生成，图片引用 IPFS。合约 owner 可能更新图片或集合 URI 以修复失效链接。区块链与智能合约风险由你自行承担，包括 bug、拥堵和钱包故障。',
        ],
      },
      {
        title: '公平使用',
        body: [
          '不要使用机器人、多账号、漏洞或其他滥用方式获取卡片或干扰服务。为保护活动或其他用户，我们可以暂停 mint、拒绝领取或使未使用的 voucher 失效。',
        ],
      },
      {
        title: '不提供担保',
        body: [
          '服务与卡片按现状提供，不作任何明示或默示担保。在法律允许的最大范围内，我们不对使用服务或卡片造成的间接或后果性损失负责。',
        ],
      },
      {
        title: '联系',
        body: [
          '问题：在 github.com/Dnevend/classy-github 提 issue。这些条款不构成法律意见；活动发展过程中可能会更新。',
        ],
      },
    ],
  },
  back: '返回总览',
};

export const getLegalCopy = (locale: string): LegalCopy =>
  locale === 'zh' ? zh : en;
