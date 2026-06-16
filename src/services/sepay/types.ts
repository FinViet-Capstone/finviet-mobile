/**
 * SePay API types. SePay (https://sepay.vn) is a Vietnamese bank-transaction
 * service: it monitors a linked bank account and exposes its transactions over
 * a REST API authenticated with a static API token (no OAuth token exchange).
 *
 * Phase 1 ships a "Sắp ra mắt" placeholder — these types + client describe the
 * Phase-2 contract; nothing calls the live client yet.
 */

export interface SePayConfig {
  apiUrl: string;
  /** Static API token issued from the SePay dashboard (Bearer auth). */
  apiToken: string;
}

/** A bank SePay supports linking against. */
export interface SePayBank {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  /** Vietnamese bank code, e.g. "ACB", "VCB". */
  code: string;
}

export interface SePayAccount {
  id: string;
  bankId: string;
  accountNumber: string;
  accountHolder?: string;
  /** Last 4 digits, for display. */
  mask?: string;
  balance: {
    current: number;
    available?: number;
    currency: string;
  };
}

export interface SePayTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  transaction_date: string; // 'YYYY-MM-DD'
  description: string;
  /** Payer/payee name on the bank statement. */
  counterparty?: string;
  /** SePay reference / bank transaction code. */
  reference_code?: string;
  pending: boolean;
  /** Money direction: 'in' = credit/received, 'out' = debit/spent. */
  direction: 'in' | 'out';
}

/** Short-lived token used to open SePay's account-connect flow. */
export interface SePayConnectToken {
  connect_token: string;
  expiration: string;
}

/** Result of completing the connect flow — identifies the linked account. */
export interface SePayConnection {
  connection_id: string;
  account_id: string;
}

export interface SePayTransactionSyncRequest {
  account_id: string;
  start_date?: string;
  end_date?: string;
}

export interface SePayTransactionSyncResponse {
  transactions: SePayTransaction[];
  accounts: SePayAccount[];
  has_more: boolean;
  next_cursor?: string;
}
