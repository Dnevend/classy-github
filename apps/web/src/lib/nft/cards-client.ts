import {
  connectWallet,
  getInjectedProvider,
  isUserRejected,
  type InjectedProvider,
} from './client.ts';
import type { NftCopy } from './copy.ts';
import { THEME_NAMES, isTheme, themeName, type Theme } from './types.ts';

interface CardsPageData {
  copy: NftCopy;
  chainId: number;
  initialAddress?: string;
}

interface CardView {
  tokenId: number;
  theme: Theme;
  serial: number;
}

interface CardsResponse {
  address: string;
  balance: number;
  cards: CardView[];
  truncated: boolean;
}

const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector);

const readPageData = (): CardsPageData | null => {
  const node = document.getElementById('nft-cards-data');
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as CardsPageData;
  } catch {
    return null;
  }
};

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export const initCardsPage = async (): Promise<void> => {
  const data = readPageData();
  if (!data) return;

  const copy = data.copy;
  const form = $<HTMLFormElement>('[data-card-form]');
  const input = $<HTMLInputElement>('[data-card-address]');
  const list = $<HTMLElement>('[data-card-list]');
  const count = $<HTMLElement>('[data-card-count]');
  const empty = $<HTMLElement>('[data-card-empty]');
  const truncated = $<HTMLElement>('[data-card-truncated]');
  const status = $<HTMLElement>('[data-card-status]');
  const hint = $<HTMLElement>('[data-card-hint]');
  const connect = $<HTMLButtonElement>('[data-card-connect]');
  if (!form || !input || !list) return;

  let provider: InjectedProvider | null = getInjectedProvider();
  let busy = false;

  const setStatus = (
    message: string,
    kind: 'info' | 'error' = 'info'
  ): void => {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  };

  const setBusy = (value: boolean): void => {
    busy = value;
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );
    if (submit) submit.disabled = value;
    if (connect) connect.disabled = value;
    if (input) input.disabled = value;
  };

  const render = (response: CardsResponse): void => {
    list.replaceChildren();
    if (empty) empty.hidden = response.cards.length > 0;
    if (truncated) truncated.hidden = !response.truncated;
    if (count) {
      count.textContent = copy.cardsPage.count.replace(
        '{n}',
        String(response.balance)
      );
    }

    for (const card of response.cards) {
      const article = document.createElement('article');
      article.className = 'nft-card';

      const media = document.createElement('div');
      media.className = 'nft-card__media';
      const img = document.createElement('img');
      img.src = `/nft/${THEME_NAMES[card.theme]}.png`;
      img.alt = '';
      img.width = 512;
      img.height = 512;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.append(img);

      const top = document.createElement('div');
      top.className = 'nft-card__top';
      const token = document.createElement('span');
      token.textContent = `#${card.tokenId}`;
      const serial = document.createElement('span');
      serial.textContent = `${card.serial} / 2212`;
      top.append(token, serial);

      const title = document.createElement('h3');
      title.className = 'nft-card__title';
      title.textContent = `${themeName(card.theme).toUpperCase()} #${card.serial}`;

      const line = document.createElement('p');
      line.className = 'nft-card__line';
      line.textContent = copy.cardsPage.owned;

      const bottom = document.createElement('div');
      bottom.className = 'nft-card__bottom';
      const link = document.createElement('a');
      link.className = 'nft-button nft-button--card';
      link.href = `/nft/card/${card.tokenId}`;
      link.textContent = copy.cardsPage.open;
      bottom.append(link);

      article.append(media, top, title, line, bottom);
      list.append(article);
    }
  };

  const load = async (rawAddress: string): Promise<void> => {
    const address = rawAddress.trim();
    list.replaceChildren();
    if (empty) empty.hidden = true;
    if (truncated) truncated.hidden = true;
    if (count) count.textContent = '';

    if (!ADDRESS.test(address)) {
      setStatus(copy.cardsPage.invalid, 'error');
      return;
    }
    if (busy) return;

    setBusy(true);
    setStatus(copy.cardsPage.loading, 'info');

    try {
      const response = await fetch(
        `/api/nft/cards?address=${encodeURIComponent(address)}`,
        { headers: { accept: 'application/json' } }
      );
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        setStatus(
          typeof body.error === 'string' && body.error === 'invalid_address'
            ? copy.cardsPage.invalid
            : copy.cardsPage.error,
          'error'
        );
        return;
      }

      const cards = (Array.isArray(body.cards) ? body.cards : []).filter(
        (card): card is CardView =>
          Boolean(
            card &&
              typeof card === 'object' &&
              isTheme((card as CardView).theme) &&
              typeof (card as CardView).tokenId === 'number' &&
              typeof (card as CardView).serial === 'number'
          )
      );
      const balance =
        typeof body.balance === 'number' ? body.balance : cards.length;

      setStatus('', 'info');
      render({
        address: typeof body.address === 'string' ? body.address : address,
        balance,
        cards,
        truncated: body.truncated === true,
      });

      const url = new URL(window.location.href);
      url.searchParams.set('address', address);
      window.history.replaceState({}, '', url);

      // The language link is rendered server-side; keep its address query in
      // sync when the lookup happens without a full navigation.
      const langLink = $<HTMLAnchorElement>('.nft-lang');
      if (langLink) {
        const target = new URL(langLink.href, window.location.href);
        target.searchParams.set('address', address);
        langLink.href = target.toString();
      }
    } catch {
      setStatus(copy.cardsPage.error, 'error');
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void load(input.value);
  });

  connect?.addEventListener('click', () => {
    if (busy) return;
    const p = provider ?? getInjectedProvider();
    if (!p) {
      if (hint) hint.hidden = false;
      return;
    }
    provider = p;
    setBusy(true);
    connectWallet(p)
      .then(async (address) => {
        input.value = address;
        if (hint) hint.hidden = true;
        setBusy(false);
        await load(address);
      })
      .catch((error) => {
        setStatus(
          isUserRejected(error)
            ? copy.errors.user_rejected
            : copy.common.error,
          'error'
        );
      })
      .finally(() => setBusy(false));
  });

  if (!provider && hint) hint.hidden = false;

  const initial = (data.initialAddress ?? input.value).trim();
  if (initial) {
    input.value = initial;
    await load(initial);
  }
};
