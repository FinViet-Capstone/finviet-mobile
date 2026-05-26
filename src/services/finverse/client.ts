import Constants from 'expo-constants';
import type {
  FinVerseAuthResponse,
  FinVerseInstitution,
  FinVerseAccount,
  FinVerseLinkToken,
  FinVerseAccessToken,
  FinVerseTransactionSyncRequest,
  FinVerseTransactionSyncResponse,
} from './types';

const API_URL = Constants.expoConfig?.extra?.finverseApiUrl || 'https://api.finverse.com/v1';
const CLIENT_ID = Constants.expoConfig?.extra?.finverseClientId || '';
const CLIENT_SECRET = Constants.expoConfig?.extra?.finverseClientSecret || '';

class FinVerseClient {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private async ensureAuth(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`FinVerse auth failed: ${response.statusText}`);
    }

    const data: FinVerseAuthResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.ensureAuth();
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FinVerse API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async getInstitutions(country: string = 'VN'): Promise<FinVerseInstitution[]> {
    return this.request<FinVerseInstitution[]>(`/institutions?country=${country}`);
  }

  async createLinkToken(userId: string): Promise<FinVerseLinkToken> {
    return this.request<FinVerseLinkToken>('/link/token/create', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: userId },
        products: ['transactions', 'accounts'],
        country_codes: ['VN'],
      }),
    });
  }

  async exchangePublicToken(publicToken: string): Promise<FinVerseAccessToken> {
    return this.request<FinVerseAccessToken>('/item/public_token/exchange', {
      method: 'POST',
      body: JSON.stringify({ public_token: publicToken }),
    });
  }

  async getAccounts(accessToken: string): Promise<FinVerseAccount[]> {
    return this.request<FinVerseAccount[]>('/accounts/get', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });
  }

  async syncTransactions(
    accessToken: string,
    request: FinVerseTransactionSyncRequest,
  ): Promise<FinVerseTransactionSyncResponse> {
    return this.request<FinVerseTransactionSyncResponse>('/transactions/sync', {
      method: 'POST',
      body: JSON.stringify({
        access_token: accessToken,
        ...request,
      }),
    });
  }
}

export const finverseClient = new FinVerseClient();
