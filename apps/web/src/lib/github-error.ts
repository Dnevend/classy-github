/** GitHub 限流信息：页面可以根据它显示预计恢复时间，缓存层可以据此短暂熔断。 */
export interface RateLimitInfo {
  /** 当前窗口剩余请求数；主限流时通常是 0 */
  remaining?: number;
  /** 窗口重置时间（UTC epoch 秒） */
  resetAt?: number;
  /** 二级限流要求的重试等待秒数 */
  retryAfter?: number;
}

/**
 * GitHub REST / GraphQL 的统一错误。
 *
 * `rateLimit` 有值才代表限流；普通 403（token 权限不足）不应该显示成
 * “匿名请求过多”，所以这里把限流元数据和状态码分开。
 */
export class GitHubError extends Error {
  status: number;
  rateLimit?: RateLimitInfo;

  constructor(
    status: number,
    message: string,
    options: { rateLimit?: RateLimitInfo } = {}
  ) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.rateLimit = options.rateLimit;
  }
}
