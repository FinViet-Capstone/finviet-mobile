/**
 * real/finverse.ts — Finverse consumer bank-aggregation (replaces the SePay merchant flow).
 *
 * Flow: createFinverseLink() returns the hosted Link UI url → open it in a WebView →
 * the user picks their bank and logs in on Finverse → Finverse redirects to redirectUri
 * with ?code= → the WebView captures the code → exchangeFinverse(code) creates the linked
 * wallet(s) and imports transactions server-side.
 *
 * Backend: POST /linked-wallets/finverse/link · POST /linked-wallets/finverse/exchange.
 */

import { api, unwrap } from '@/lib/api';
import type { Wallet, WalletType } from '@/types';

interface LinkDto {
  linkUrl: string;
  state: string;
  redirectUri: string;
}

interface WalletDto {
  walletId: string;
  customerId: string;
  walletName: string;
  walletType: string;
  balance: number;
}

export interface FinverseLink {
  linkUrl: string;
  state: string;
  /** The WebView watches navigations to this URL to capture the auth code. */
  redirectUri: string;
}

function toWalletType(raw: string): WalletType {
  return /link|finverse|sepay/i.test(raw ?? '') ? 'linked' : 'basic';
}

function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.walletId,
    customerId: dto.customerId,
    name: dto.walletName,
    type: toWalletType(dto.walletType),
    balance: dto.balance,
    isDeleted: false,
    createdAt: '',
    updatedAt: '',
  };
}

/** Start a link session and get the hosted Link UI url to open. */
export async function createFinverseLink(): Promise<FinverseLink> {
  const res = await api.post('/linked-wallets/finverse/link');
  const d = unwrap<LinkDto>(res);
  return { linkUrl: d.linkUrl, state: d.state, redirectUri: d.redirectUri };
}

/** Complete linking: exchange the captured code → returns the created linked wallet(s). */
export async function exchangeFinverse(code: string, state?: string): Promise<Wallet[]> {
  const res = await api.post('/linked-wallets/finverse/exchange', {
    code,
    state: state ?? null,
  });
  return unwrap<WalletDto[]>(res).map(toWallet);
}
