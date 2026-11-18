import { getAddress, type Address, type Hex } from 'viem';
import {
  changeWallet,
  chainName,
  connectWallet,
  explorerTxUrl,
  getInjectedProvider,
  isUserRejected,
  mintPass,
  readAccounts,
  readChainId,
  revertNameOf,
  shortAddress,
  signClaimMessage,
  switchChain,
  type InjectedProvider,
} from './client.ts';
import type { NftCopy, NftLocale } from './copy.ts';
import { THEME_NAMES, isTheme, themeName, type Theme } from './types.ts';

interface ClaimView {
  theme: Theme;
  status: 'issued' | 'confirmed' | 'expired';
  wallet: string;
  tokenId?: number;
  serial?: number;
  txHash?: string;
}

interface StatsResponse {
  chainId: number;
  contract: string;
  stats: number[];
  remaining: number[];
  total: number;
}

interface SessionResponse {
  authenticated: boolean;
  login?: string;
  ghId?: number;
  claims?: ClaimView[];
}

interface PrepareResponse {
  message: string;
  deadline: number;
  claimKey: Hex;
}

interface VoucherResponse {
  claimKey: Hex;
  signature: Hex;
  voucher: {
    to: Address;
    theme: Theme;
    claimKey: Hex;
    deadline: number;
  };
  chainId: number;
  contract: Address;
}

interface ConfirmResponse {
  ok: true;
  theme: Theme;
  tokenId?: number;
  serial?: number;
  txHash?: string;
}

interface PageData {
  locale: NftLocale;
  copy: NftCopy;
  chainId: number;
  contract: string | null;
  login?: string;
  ghId?: number;
  selectedTheme?: Theme;
  claims?: ClaimView[];
}

class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly extra: Record<string, unknown>;

  constructor(
    code: string,
    status: number,
    extra: Record<string, unknown> = {}
  ) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector);

const $$ = <T extends Element = HTMLElement>(selector: string): T[] => [
  ...document.querySelectorAll<T>(selector),
];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const readPageData = (): PageData | null => {
  const node = document.getElementById('nft-page-data');
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as PageData;
  } catch {
    return null;
  }
};

const requestJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init?.body) headers['content-type'] = 'application/json';

  const response = await fetch(url, {
    ...init,
    headers,
  });
  if (response.status === 429) {
    throw new ApiError('rate_limited', 429, {
      retryAfter: response.headers.get('retry-after'),
    });
  }
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'unknown',
      response.status,
      data
    );
  }
  return data as T;
};

const postJson = <T>(url: string, body: unknown): Promise<T> =>
  requestJson<T>(url, { method: 'POST', body: JSON.stringify(body) });

const messageFor = (copy: NftCopy, error: unknown): string => {
  if (isUserRejected(error)) return copy.errors.user_rejected;

  if (error instanceof ApiError) {
    if (
      error.code === 'voucher_pending' &&
      typeof error.extra.wallet === 'string'
    ) {
      return `${copy.claim.pending} ${shortAddress(
        error.extra.wallet
      )}. ${copy.claim.pendingHint}`;
    }
    const errors = copy.errors as Record<string, string>;
    return errors[error.code] ?? copy.errors.unknown;
  }

  return copy.errors.unknown;
};

const themeFromValue = (value: unknown): Theme | null => {
  const index = THEME_NAMES.indexOf(value as (typeof THEME_NAMES)[number]);
  return index >= 0 ? (index as Theme) : null;
};

const parseThemeAttr = (element: Element): Theme | null =>
  themeFromValue(
    element.getAttribute('data-theme') ??
      element.closest('[data-theme]')?.getAttribute('data-theme') ??
      null
  );

const applyStats = (stats: StatsResponse | null): void => {
  const totalMinted = stats?.total ?? null;
  const totalRemaining = stats ? 8848 - stats.total : null;

  const totalMintedEl = $('[data-total-minted]');
  const totalRemainingEl = $('[data-total-remaining]');
  if (totalMintedEl) {
    totalMintedEl.textContent =
      totalMinted == null ? '—' : totalMinted.toLocaleString();
  }
  if (totalRemainingEl) {
    totalRemainingEl.textContent =
      totalRemaining == null ? '—' : totalRemaining.toLocaleString();
  }

  for (let i = 0; i < THEME_NAMES.length; i += 1) {
    const theme = THEME_NAMES[i];
    const cell = $(`[data-stat-theme="${theme}"]`);
    if (!cell) continue;
    const minted = cell.querySelector<HTMLElement>('[data-stat-minted]');
    const remaining = cell.querySelector<HTMLElement>('[data-stat-remaining]');
    if (minted) {
      minted.textContent =
        stats == null ? '—' : String(stats.stats[i] ?? 0);
    }
    if (remaining) {
      remaining.textContent =
        stats == null ? '—' : String(stats.remaining[i] ?? 0);
    }
  }
};

const cardState = (
  claim: ClaimView | undefined,
  remaining: number | null | undefined
): 'available' | 'claimed' | 'soldout' | 'pending' => {
  if (claim?.status === 'confirmed') return 'claimed';
  if (claim?.status === 'issued') return 'pending';
  if (remaining != null && remaining <= 0) return 'soldout';
  return 'available';
};

const statusText = (
  copy: NftCopy,
  state: 'available' | 'claimed' | 'soldout' | 'pending',
  claim?: ClaimView
): string => {
  if (state === 'claimed') {
    return `${copy.cardMeta.claimed}${
      claim?.serial ? ` #${claim.serial}` : ''
    }`;
  }
  if (state === 'pending') return copy.cardMeta.inProgress;
  if (state === 'soldout') return copy.cardMeta.soldOut;
  return copy.cardMeta.available;
};

const updateLandingCard = (
  copy: NftCopy,
  theme: Theme,
  claim: ClaimView | undefined,
  remaining: number | null
): void => {
  const card = $<HTMLElement>(`[data-card][data-theme="${THEME_NAMES[theme]}"]`);
  if (!card) return;

  const state = cardState(claim, remaining);
  card.dataset.state = state;

  const status = card.querySelector<HTMLElement>('[data-card-status]');
  if (status) status.textContent = statusText(copy, state, claim);

  const remainingEl = card.querySelector<HTMLElement>(
    '[data-card-remaining]'
  );
  if (remainingEl) {
    remainingEl.textContent =
      remaining == null ? '—' : `${remaining} / 2212`;
  }

  const cta = card.querySelector<HTMLAnchorElement>('[data-card-cta]');
  if (cta) {
    const href = `/nft/claim?theme=${THEME_NAMES[theme]}`;
    cta.href = href;
    cta.textContent =
      state === 'claimed'
        ? copy.cardMeta.view
        : state === 'soldout'
          ? copy.cardMeta.soldOut
          : state === 'pending'
            ? copy.cardMeta.inProgress
            : copy.cardMeta.claim;
    cta.classList.toggle('is-disabled', state === 'soldout');
    if (state === 'soldout') {
      cta.setAttribute('aria-disabled', 'true');
    } else {
      cta.removeAttribute('aria-disabled');
    }
  }
};

export const initLanding = async (): Promise<void> => {
  const data = readPageData();
  if (!data) return;
  const copy = data.copy;

  const [statsResult, sessionResult] = await Promise.allSettled([
    requestJson<StatsResponse>('/api/nft/stats'),
    requestJson<SessionResponse>('/api/nft/session'),
  ]);

  const stats =
    statsResult.status === 'fulfilled' ? statsResult.value : null;
  const session =
    sessionResult.status === 'fulfilled' ? sessionResult.value : null;

  applyStats(stats);

  const claims = session?.claims ?? [];
  const claimByTheme = new Map(claims.map((claim) => [claim.theme, claim]));

  for (let i = 0; i < THEME_NAMES.length; i += 1) {
    const theme = i as Theme;
    updateLandingCard(
      copy,
      theme,
      claimByTheme.get(theme),
      stats?.remaining[i] ?? null
    );
  }

  const sessionLine = $('[data-session-line]');
  const sessionSection = $<HTMLElement>('[data-session-section]');
  if (session?.authenticated && session.login) {
    const confirmed = claims.filter(
      (claim) => claim.status === 'confirmed'
    ).length;

    if (sessionLine) {
      sessionLine.hidden = false;
      sessionLine.textContent = `${copy.progress.signedIn} @${session.login} · ${confirmed} ${copy.progress.ofFour}`;
    }

    if (sessionSection) {
      sessionSection.hidden = false;
      const count = sessionSection.querySelector<HTMLElement>(
        '[data-session-count]'
      );
      const note = sessionSection.querySelector<HTMLElement>(
        '[data-session-note]'
      );
      if (count) count.textContent = `${confirmed} / 4`;
      if (note) {
        note.textContent =
          confirmed === 4
            ? copy.progress.complete
            : confirmed > 0
              ? copy.progress.inProgress.replace('{n}', String(confirmed))
              : copy.progress.none;
      }
      $$('[data-session-segment]').forEach((segment) => {
        const theme = parseThemeAttr(segment);
        const claim = theme != null ? claimByTheme.get(theme) : undefined;
        segment.dataset.state =
          claim?.status === 'confirmed'
            ? 'filled'
            : claim?.status === 'issued'
              ? 'pending'
              : 'empty';
      });
    }
  } else {
    if (sessionLine) sessionLine.hidden = true;
    if (sessionSection) sessionSection.hidden = true;
  }
};

const txKey = (ghId: number, theme: Theme): string =>
  `nft:tx:${ghId}:${theme}`;

const retryDelay = (error: unknown): number => {
  const retryAfter =
    error instanceof ApiError && typeof error.extra.retryAfter === 'string'
      ? Number.parseInt(error.extra.retryAfter, 10)
      : Number.NaN;
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter * 1000, 15_000)
    : 2000;
};

const waitForConfirm = async (txHash: string): Promise<ConfirmResponse> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await postJson<ConfirmResponse>('/api/nft/confirm', { txHash });
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.status === 404 ||
          error.status === 429 ||
          error.status === 503
        ) {
          await sleep(retryDelay(error));
          continue;
        }
        throw error;
      }
      await sleep(2000);
    }
  }
  throw new ApiError('confirm_timeout', 0);
};

export const initClaim = async (): Promise<void> => {
  const data = readPageData();
  if (!data || !data.login || !data.ghId) return;

  const copy = data.copy;
  const ghId = data.ghId;
  let provider: InjectedProvider | null = getInjectedProvider();
  let address: Address | null = null;
  let walletChainId: number | null = null;
  let stats: StatsResponse | null = null;
  let claims: ClaimView[] = data.claims ?? [];
  let selected: Theme =
    data.selectedTheme != null && isTheme(data.selectedTheme)
      ? data.selectedTheme
      : 0;
  let busy = false;
  let listening = false;

  const claimFor = (theme: Theme): ClaimView | undefined =>
    claims.find((claim) => claim.theme === theme);

  const confirmedCount = (): number =>
    claims.filter((claim) => claim.status === 'confirmed').length;

  const setStatus = (
    message: string,
    kind: 'info' | 'error' | 'success' = 'info'
  ): void => {
    const node = $<HTMLElement>('[data-claim-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
    node.hidden = !message;
  };

  const showResult = (
    theme: Theme,
    tokenId: number | undefined,
    serial: number | undefined,
    txHash: string
  ): void => {
    const box = $<HTMLElement>('[data-claim-result]');
    if (!box) return;
    box.hidden = false;

    const themeEl = box.querySelector<HTMLElement>('[data-result-theme]');
    const tokenEl = box.querySelector<HTMLElement>('[data-result-token]');
    const serialEl = box.querySelector<HTMLElement>('[data-result-serial]');
    const txEl = box.querySelector<HTMLAnchorElement>('[data-tx-link]');
    const url = explorerTxUrl(data.chainId, txHash);

    if (themeEl) themeEl.textContent = themeName(theme);
    if (tokenEl) tokenEl.textContent = tokenId == null ? '—' : `#${tokenId}`;
    if (serialEl) {
      serialEl.textContent = serial == null ? '—' : `${serial} / 2212`;
    }
    if (txEl) {
      txEl.hidden = !url;
      if (url) txEl.href = url;
    }
  };

  const render = (): void => {
    for (let i = 0; i < THEME_NAMES.length; i += 1) {
      const theme = i as Theme;
      const card = $<HTMLElement>(
        `[data-card][data-theme="${THEME_NAMES[theme]}"]`
      );
      if (!card) continue;

      const claim = claimFor(theme);
      const remaining = stats?.remaining[i] ?? null;
      const state = cardState(claim, remaining);

      card.dataset.state = state;
      card.dataset.selected = String(theme === selected);

      const status = card.querySelector<HTMLElement>('[data-card-status]');
      if (status) status.textContent = statusText(copy, state, claim);

      const remainingEl = card.querySelector<HTMLElement>(
        '[data-card-remaining]'
      );
      if (remainingEl) {
        remainingEl.textContent =
          remaining == null ? '—' : `${remaining} / 2212`;
      }

      const button = card.querySelector<HTMLButtonElement>(
        '[data-claim-theme]'
      );
      if (button) {
        button.textContent =
          state === 'claimed'
            ? copy.cardMeta.claimed
            : state === 'soldout'
              ? copy.cardMeta.soldOut
              : state === 'pending'
                ? copy.cardMeta.inProgress
                : copy.cardMeta.claim;
        button.disabled = busy || state === 'claimed' || state === 'soldout';
        button.setAttribute('aria-pressed', String(theme === selected));
      }
    }

    const confirmed = confirmedCount();
    $$('[data-progress-segment]').forEach((segment, index) => {
      const claim = claimFor(index as Theme);
      segment.dataset.state =
        claim?.status === 'confirmed'
          ? 'filled'
          : claim?.status === 'issued'
            ? 'pending'
            : 'empty';
    });
    const progressLabel = $('[data-progress-label]');
    if (progressLabel) {
      progressLabel.textContent = `${confirmed} / 4`;
    }
    const progressNote = $('[data-progress-note]');
    if (progressNote) {
      progressNote.textContent =
        confirmed === 4 ? copy.claim.allDone : '';
    }

    const selectedLabel = $('[data-selected-theme]');
    if (selectedLabel) selectedLabel.textContent = themeName(selected);

    const walletAddress = $('[data-wallet-address]');
    if (walletAddress) {
      walletAddress.textContent = address
        ? shortAddress(address)
        : copy.claim.notConnected;
      if (address) walletAddress.title = address;
    }

    const network = $('[data-network]');
    if (network) {
      network.textContent = !provider
        ? copy.claim.noWallet
        : walletChainId == null
          ? copy.claim.notConnected
          : walletChainId === data.chainId
            ? chainName(data.chainId)
            : copy.claim.wrongNetwork;
    }

    const connect = $<HTMLButtonElement>('[data-connect]');
    if (connect) {
      connect.hidden = Boolean(address);
      connect.disabled = busy;
    }
    const change = $<HTMLButtonElement>('[data-change-wallet]');
    if (change) {
      change.hidden = !address;
      change.disabled = busy;
    }
    const switchButton = $<HTMLButtonElement>('[data-switch]');
    if (switchButton) {
      switchButton.hidden =
        !provider ||
        walletChainId == null ||
        walletChainId === data.chainId;
      switchButton.disabled = busy;
    }
    const noWallet = $<HTMLElement>('[data-no-wallet]');
    if (noWallet) noWallet.hidden = Boolean(provider);

    const action = $<HTMLButtonElement>('[data-claim-action]');
    if (action) {
      const claim = claimFor(selected);
      const selectedState = cardState(
        claim,
        stats?.remaining[selected] ?? null
      );
      action.disabled = busy;
      if (!provider) {
        action.textContent = copy.claim.noWallet;
        action.disabled = true;
      } else if (!address) {
        action.textContent = copy.claim.connect;
      } else if (walletChainId !== data.chainId) {
        action.textContent = copy.claim.switchNetwork;
      } else if (selectedState === 'claimed') {
        action.textContent = copy.cardMeta.claimed;
        action.disabled = true;
      } else if (selectedState === 'soldout') {
        action.textContent = copy.cardMeta.soldOut;
        action.disabled = true;
      } else if (confirmed === 4) {
        action.textContent = copy.claim.allDone;
        action.disabled = true;
      } else {
        action.textContent = `${copy.claim.action} ${themeName(selected)}`;
      }
    }
  };

  const attachProvider = (p: InjectedProvider): void => {
    if (listening) return;
    listening = true;
    p.on?.('accountsChanged', (...args: unknown[]) => {
      const accounts = args[0] as string[];
      address = accounts[0] ? getAddress(accounts[0]) : null;
      render();
    });
    p.on?.('chainChanged', (...args: unknown[]) => {
      const value = args[0];
      walletChainId =
        typeof value === 'string' ? Number.parseInt(value, 16) : null;
      render();
    });
  };

  const ensureWallet = async (): Promise<{
    provider: InjectedProvider;
    address: Address;
    chainId: number;
  } | null> => {
    const p = provider ?? getInjectedProvider();
    if (!p) {
      setStatus(copy.claim.noWallet, 'error');
      return null;
    }
    provider = p;
    attachProvider(p);

    let account = address;
    if (!account) {
      account = await connectWallet(p);
      address = account;
    }

    let chainId = await readChainId(p);
    if (chainId !== data.chainId) {
      chainId = await switchChain(p, data.chainId);
    }
    walletChainId = chainId;
    render();
    return { provider: p, address: account, chainId };
  };

  const refresh = async (): Promise<void> => {
    const [sessionResult, statsResult] = await Promise.allSettled([
      requestJson<SessionResponse>('/api/nft/session'),
      requestJson<StatsResponse>('/api/nft/stats'),
    ]);

    if (sessionResult.status === 'fulfilled') {
      if (!sessionResult.value.authenticated) {
        window.location.assign('/api/nft/oauth/start');
        return;
      }
      claims = sessionResult.value.claims ?? [];
    }

    if (statsResult.status === 'fulfilled') {
      stats = statsResult.value;
    }
    render();
  };

  const selectTheme = (theme: Theme): void => {
    if (busy) return;
    selected = theme;
    render();
  };

  const connect = async (): Promise<void> => {
    if (busy) return;
    try {
      const wallet = await ensureWallet();
      if (wallet) setStatus('', 'info');
    } catch (error) {
      setStatus(messageFor(copy, error), 'error');
    }
  };

  const change = async (): Promise<void> => {
    if (busy) return;
    const p = provider ?? getInjectedProvider();
    if (!p) {
      setStatus(copy.claim.noWallet, 'error');
      return;
    }
    try {
      provider = p;
      attachProvider(p);
      address = await changeWallet(p);
      walletChainId = await readChainId(p);
      setStatus('', 'info');
      render();
    } catch (error) {
      setStatus(messageFor(copy, error), 'error');
    }
  };

  const switchNetwork = async (): Promise<void> => {
    if (busy) return;
    const p = provider ?? getInjectedProvider();
    if (!p) {
      setStatus(copy.claim.noWallet, 'error');
      return;
    }
    try {
      provider = p;
      attachProvider(p);
      walletChainId = await switchChain(p, data.chainId);
      setStatus('', 'info');
      render();
    } catch (error) {
      setStatus(messageFor(copy, error), 'error');
    }
  };

  const claim = async (): Promise<void> => {
    if (busy) return;
    if (!data.contract) {
      setStatus(copy.errors.not_configured, 'error');
      return;
    }

    // Set the lock before the wallet prompt: connecting/switching can take
    // seconds, and a second click must not start a parallel claim.
    busy = true;
    setStatus(copy.claim.preparing, 'info');
    render();

    try {
      const wallet = await ensureWallet();
      if (!wallet) return;

      const existing = claimFor(selected);
      if (existing?.status === 'confirmed') {
        setStatus(copy.claim.already, 'error');
        return;
      }
      if (
        stats &&
        stats.remaining[selected] <= 0 &&
        existing?.status !== 'issued'
      ) {
        setStatus(copy.claim.soldOut, 'error');
        return;
      }

      const prepared = await postJson<PrepareResponse>('/api/nft/prepare', {
        theme: selected,
        address: wallet.address,
      });

      setStatus(copy.claim.signing, 'info');
      const signature = await signClaimMessage({
        provider: wallet.provider,
        address: wallet.address,
        chainId: wallet.chainId,
        message: prepared.message,
      });

      const voucher = await postJson<VoucherResponse>('/api/nft/voucher', {
        theme: selected,
        address: wallet.address,
        deadline: prepared.deadline,
        signature,
      });

      setStatus(copy.claim.minting, 'info');
      const txHash = await mintPass({
        provider: wallet.provider,
        address: wallet.address,
        chainId: wallet.chainId,
        contract: data.contract as Address,
        voucher: voucher.voucher,
        signature: voucher.signature,
      });

      window.localStorage.setItem(txKey(ghId, selected), txHash);

      setStatus(copy.claim.confirming, 'info');
      const confirmed = await waitForConfirm(txHash);
      window.localStorage.removeItem(txKey(ghId, selected));

      showResult(selected, confirmed.tokenId, confirmed.serial, txHash);
      setStatus(
        `${copy.claim.success}${
          confirmed.serial ? ` #${confirmed.serial}` : ''
        } / 2212`,
        'success'
      );

      await refresh();
    } catch (error) {
      if (isUserRejected(error)) {
        setStatus(copy.errors.user_rejected, 'error');
      } else {
        const revert = revertNameOf(error);
        if (revert === 'SoldOut') {
          // The cached stats looked fine but the chain is authoritative.
          setStatus(copy.claim.soldOut, 'error');
          await refresh();
        } else if (revert === 'ClaimAlreadyUsed') {
          setStatus(copy.claim.already, 'error');
          await refresh();
        } else {
          setStatus(messageFor(copy, error), 'error');
        }
      }
    } finally {
      busy = false;
      render();
    }
  };

  const recoverPending = async (): Promise<void> => {
    for (const claim of claims) {
      // `expired` is a derived state; the KV record may still be `issued` and
      // the mint may have landed before confirm. Always try a stored tx hash.
      if (claim.status !== 'issued' && claim.status !== 'expired') continue;
      const hash = window.localStorage.getItem(txKey(ghId, claim.theme));
      if (!hash) continue;
      try {
        const confirmed = await waitForConfirm(hash);
        window.localStorage.removeItem(txKey(ghId, claim.theme));
        showResult(claim.theme, confirmed.tokenId, confirmed.serial, hash);
        setStatus(copy.claim.success, 'success');
      } catch {
        // Leave the pending record; the user can retry later.
      }
    }
    await refresh();
  };

  // Bind handlers before the first network refresh: stats can take a few
  // seconds, and a click during that window must not be silently lost.
  $('[data-connect]')?.addEventListener('click', () => {
    void connect();
  });
  $('[data-change-wallet]')?.addEventListener('click', () => {
    void change();
  });
  $('[data-switch]')?.addEventListener('click', () => {
    void switchNetwork();
  });
  $('[data-claim-action]')?.addEventListener('click', () => {
    void claim();
  });
  $$('[data-claim-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      const theme = parseThemeAttr(button);
      if (theme != null) selectTheme(theme);
    });
  });

  if (provider) {
    attachProvider(provider);
    try {
      const accounts = await readAccounts(provider);
      address = accounts[0] ? getAddress(accounts[0]) : null;
      walletChainId = await readChainId(provider);
    } catch {
      // A wallet can reject reads before the first connection.
    }
  }

  await refresh();

  if (data.selectedTheme != null && isTheme(data.selectedTheme)) {
    selected = data.selectedTheme;
  } else {
    const firstAvailable = THEME_NAMES.findIndex((_, index) => {
      const claim = claimFor(index as Theme);
      return (
        claim?.status !== 'confirmed' &&
        (stats?.remaining[index] ?? 1) > 0
      );
    });
    if (firstAvailable >= 0) selected = firstAvailable as Theme;
  }

  render();
  void recoverPending();
};
