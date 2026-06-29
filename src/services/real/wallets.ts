/**
 * real/wallets.ts — real .NET wallet service.
 *
 * Mirrors the exported signatures of src/services/mock/wallets.ts so the barrel
 * (src/services/index.ts) can swap mock ⇄ real with zero hook/screen changes.
 * Reads are async here (HTTP) where the mock was synchronous — every consumer
 * goes through TanStack Query's queryFn, which awaits either shape.
 *
 * Backend: api/wallets/* (WalletsController). Responses use the ApiResponse<T>
 * envelope; unwrap() peels off `.data`.
 */

import { api, unwrap } from '@/lib/api';
import type { Wallet, WalletSummary, WalletType } from '@/types';
import type { CreateWalletInput, UpdateWalletInput } from '@/services/mock/wallets';

// ─── Backend DTO shapes (camelCase over the wire) ─────────────────────────────

interface WalletDto {
  walletId: string;
  customerId: string;
  walletName: string;
  walletType: string;
  balance: number;
}

interface WalletListDto {
  totalBalance: number;
  wallets: WalletDto[];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/** Backend walletType is a free string; collapse it onto the FE union. */
function toWalletType(raw: string): WalletType {
  const v = (raw ?? '').toLowerCase();
  return v.includes('link') || v.includes('sepay') ? 'linked' : 'basic';
}

function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.walletId,
    customerId: dto.customerId,
    name: dto.walletName,
    type: toWalletType(dto.walletType),
    balance: dto.balance,
    isDeleted: false,
    // The backend response carries no timestamps; the UI never renders them for
    // wallets, so empty strings keep the type honest without inventing data.
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getWallets(): Promise<WalletSummary> {
  const res = await api.get('/wallets');
  const data = unwrap<WalletListDto>(res);
  return {
    wallets: data.wallets.map(toWallet),
    totalBalance: data.totalBalance,
  };
}

export async function getWalletById(id: string): Promise<Wallet | undefined> {
  const res = await api.get(`/wallets/${id}`);
  return toWallet(unwrap<WalletDto>(res));
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const res = await api.post('/wallets', {
    walletName: input.name.trim(),
    walletType: input.type,
    initialBalance: input.balance,
  });
  return toWallet(unwrap<WalletDto>(res));
}

export async function updateWallet(
  id: string,
  patch: UpdateWalletInput,
): Promise<Wallet> {
  const res = await api.patch(`/wallets/${id}`, {
    ...(patch.name !== undefined ? { walletName: patch.name.trim() } : {}),
    ...(patch.type !== undefined ? { walletType: patch.type } : {}),
  });
  return toWallet(unwrap<WalletDto>(res));
}

export async function deleteWallet(id: string): Promise<void> {
  await api.delete(`/wallets/${id}`);
}
