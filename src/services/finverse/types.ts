export interface FinVerseConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface FinVerseAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FinVerseInstitution {
  id: string;
  name: string;
  logo?: string;
  country: string;
  products: string[];
}

export interface FinVerseAccount {
  id: string;
  institution_id: string;
  name: string;
  type: string;
  subtype?: string;
  mask?: string;
  balance: {
    current: number;
    available?: number;
    currency: string;
  };
}

export interface FinVerseTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  merchant_name?: string;
  category?: string[];
  pending: boolean;
  transaction_type: 'debit' | 'credit';
}

export interface FinVerseLinkToken {
  link_token: string;
  expiration: string;
}

export interface FinVersePublicToken {
  public_token: string;
}

export interface FinVerseAccessToken {
  access_token: string;
  item_id: string;
}

export interface FinVerseTransactionSyncRequest {
  account_id: string;
  start_date?: string;
  end_date?: string;
}

export interface FinVerseTransactionSyncResponse {
  transactions: FinVerseTransaction[];
  accounts: FinVerseAccount[];
  has_more: boolean;
  next_cursor?: string;
}
