/**
 * Shared helpers for walking viem / wallet error chains.
 *
 * viem's `BaseError.walk(fn)` returns the first error object matched by `fn`
 * (not a boolean), so its result must be treated as a match rather than a
 * truthy predicate return.
 */
const findInErrorChain = (
  error: unknown,
  match: (value: object) => boolean
): object | null => {
  const seen = new Set<unknown>();

  const visit = (value: unknown, depth: number): object | null => {
    if (depth > 6 || !value || typeof value !== 'object' || seen.has(value)) {
      return null;
    }
    seen.add(value);
    if (match(value)) return value;

    const record = value as {
      cause?: unknown;
      walk?: (fn: (cause: unknown) => boolean) => unknown;
    };

    if (typeof record.walk === 'function') {
      try {
        const hit = record.walk((cause) =>
          Boolean(cause && typeof cause === 'object' && match(cause))
        );
        if (hit && typeof hit === 'object') return hit;
      } catch {
        // Ignore a broken walk implementation.
      }
    }

    return 'cause' in record ? visit(record.cause, depth + 1) : null;
  };

  return visit(error, 0);
};

export const isUserRejected = (error: unknown): boolean =>
  Boolean(
    findInErrorChain(
      error,
      (value) => (value as { code?: number }).code === 4001
    )
  );

/** Revert name decoded by viem from the ABI error list, if any. */
export const revertNameOf = (error: unknown): string | null => {
  const hit = findInErrorChain(error, (value) => {
    const data = (value as { data?: { errorName?: unknown } }).data;
    return typeof data?.errorName === 'string';
  });
  if (!hit) return null;
  return (hit as { data: { errorName: string } }).data.errorName;
};
