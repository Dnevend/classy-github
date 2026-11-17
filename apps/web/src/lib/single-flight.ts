/**
 * 同 isolate 内的请求合并（single-flight）。
 *
 * 论坛 / 社交平台带来的是同一秒内的重复冷请求：每个都 miss 缓存、都去打
 * GitHub，配额会被瞬间放大。这里让同一个 key 只执行一次，其余调用共享结果。
 *
 * 注意：Map 只在单个 Worker isolate 内有效，跨机房仍可能各自回源一次；
 * 这是廉价的第一道闸，真正的兜底是边缘缓存 + stale。
 */
const inflight = new Map<string, Promise<unknown>>();

export const singleFlight = <T>(
  key: string,
  task: () => Promise<T>
): Promise<T> => {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  let promise: Promise<T>;
  promise = task().finally(() => {
    // 只有当前任务还挂在 Map 上时才删，避免误删后来者。
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);

  return promise;
};

/** 测试用：清空未完成的任务表。 */
export const resetSingleFlight = (): void => {
  inflight.clear();
};
