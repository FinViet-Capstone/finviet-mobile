import type {
  SePayBank,
  SePayAccount,
  SePayConnectToken,
  SePayConnection,
  SePayTransactionSyncRequest,
  SePayTransactionSyncResponse,
} from './types';

// SePay authenticates with a static API token (Bearer), not an OAuth handshake.
const API_URL = process.env.EXPO_PUBLIC_SEPAY_API_URL ?? 'https://my.sepay.vn/userapi';
const API_TOKEN = process.env.EXPO_PUBLIC_SEPAY_API_TOKEN ?? '';

class SePayClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SePay API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /** Banks available to link, optionally filtered by country (SePay is VN-only today). */
  async getInstitutions(country: string = 'VN'): Promise<SePayBank[]> {
    return this.request<SePayBank[]>(`/banks?country=${country}`);
  }

  /** Begin the account-connect flow; returns a short-lived connect token. */
  async createConnectToken(customerId: string): Promise<SePayConnectToken> {
    return this.request<SePayConnectToken>('/connect/token', {
      method: 'POST',
      body: JSON.stringify({ user_id: customerId }),
    });
  }

  /** Complete the connect flow, exchanging the connect token for a connection. */
  async exchangeConnectToken(connectToken: string): Promise<SePayConnection> {
    return this.request<SePayConnection>('/connect/exchange', {
      method: 'POST',
      body: JSON.stringify({ connect_token: connectToken }),
    });
  }

  async getAccounts(): Promise<SePayAccount[]> {
    return this.request<SePayAccount[]>('/accounts');
  }

  async syncTransactions(
    request: SePayTransactionSyncRequest,
  ): Promise<SePayTransactionSyncResponse> {
    const params = new URLSearchParams({ account_id: request.account_id });
    if (request.start_date) params.set('start_date', request.start_date);
    if (request.end_date) params.set('end_date', request.end_date);
    return this.request<SePayTransactionSyncResponse>(`/transactions?${params.toString()}`);
  }
}

export const sepayClient = new SePayClient();
