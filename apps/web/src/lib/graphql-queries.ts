/**
 * GraphQL 查询集中放在这里，方便 smoke 测试直接 import，也避免页面文件里
 * 夹着大段查询字符串。
 *
 * 注意：GitHub 的 `User.repository` 在同一个 selection set 里出现两个别名时
 * 会报 `missing required arguments: owner`（实测），所以 profile 查询只取
 * profile README，classy.config.json 用单独的 Config 查询。
 */

export const PROFILE_QUERY = `query Profile($login: String!, $repoCount: Int!, $gistCount: Int!) {
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    company
    location
    websiteUrl
    twitterUsername
    createdAt
    followers { totalCount }
    following { totalCount }
    repositories(
      first: $repoCount
      privacy: PUBLIC
      ownerAffiliations: OWNER
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        name
        description
        isPrivate
        stargazerCount
        forkCount
        isFork
        isTemplate
        homepageUrl
        updatedAt
        url
        primaryLanguage { name }
      }
    }
    gists(
      first: $gistCount
      privacy: PUBLIC
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        id
        description
        createdAt
        updatedAt
        isPublic
        url
        files(limit: 100) {
          name
          size
          language { name }
        }
        comments { totalCount }
      }
    }
    profileRepo: repository(name: $login) {
      object(expression: "HEAD:README.md") {
        ... on Blob { text }
      }
    }
  }
}`;

export const CONFIG_QUERY = `query Config($login: String!) {
  user(login: $login) {
    repository(name: "classy-github") {
      object(expression: "HEAD:classy.config.json") {
        ... on Blob { text }
      }
    }
  }
}`;

export const REPOS_QUERY = `query ReposPage($login: String!, $first: Int!) {
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    company
    location
    websiteUrl
    twitterUsername
    createdAt
    followers { totalCount }
    following { totalCount }
    repositories(first: $first, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        description
        isPrivate
        stargazerCount
        forkCount
        isFork
        isTemplate
        homepageUrl
        updatedAt
        url
        primaryLanguage { name }
      }
    }
  }
}`;

export const GISTS_QUERY = `query UserGists($login: String!, $gistCount: Int!) {
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    company
    location
    websiteUrl
    twitterUsername
    createdAt
    followers { totalCount }
    following { totalCount }
    repositories(first: 1, privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    gists(
      first: $gistCount
      privacy: PUBLIC
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        id
        description
        createdAt
        updatedAt
        isPublic
        url
        files(limit: 100) {
          name
          size
          language { name }
        }
        comments { totalCount }
      }
    }
  }
}`;

export const USER_INFO_QUERY = `query UserInfo($login: String!) {
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    company
    location
    websiteUrl
    twitterUsername
    createdAt
    followers { totalCount }
    following { totalCount }
    repositories(first: 1, privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    gists(first: 1, privacy: PUBLIC) { totalCount }
  }
}`;

export const REPO_DETAIL_QUERY = `query RepoDetail($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    stargazerCount
    forkCount
    isFork
    isTemplate
    homepageUrl
    updatedAt
    url
    primaryLanguage { name }
    owner { login }
    readme: object(expression: "HEAD:README.md") {
      ... on Blob { text }
    }
  }
}`;

export const GIST_COMMENTS_QUERY = `query GistComments($id: ID!) {
  node(id: $id) {
    ... on Gist {
      id
      isPublic
      owner { login }
      comments(first: 100) {
        nodes {
          id
          databaseId
          body
          createdAt
          author {
            login
            avatarUrl
            url
          }
        }
      }
    }
  }
}`;

export const OG_STATS_QUERY = `query OgStats($login: String!, $repoCount: Int!) {
  user(login: $login) {
    login
    name
    avatarUrl
    followers { totalCount }
    publicRepos: repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    publicGists: gists(privacy: PUBLIC) { totalCount }
    repositories(first: $repoCount, privacy: PUBLIC, ownerAffiliations: OWNER) {
      nodes {
        stargazerCount
        primaryLanguage { name }
      }
    }
  }
}`;
