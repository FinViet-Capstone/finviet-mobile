/* eslint-disable import/first -- filesystem mock state must exist before the mocked module loads */

const mockFsState = {
  directories: new Set<string>(),
  files: new Set<string>(),
};

jest.mock('expo-file-system', () => {
  const joinParts = (parts: (string | MockDirectory)[]) =>
    parts
      .map((part) => (part instanceof MockDirectory ? part.uri : part))
      .reduce((path, part) => (path ? `${path.replace(/\/$/, '')}/${part.replace(/^\//, '')}` : part), '');

  class MockDirectory {
    uri: string;

    constructor(...parts: (string | MockDirectory)[]) {
      this.uri = joinParts(parts);
    }

    get exists() {
      return mockFsState.directories.has(this.uri);
    }

    create() {
      mockFsState.directories.add(this.uri);
    }

    list() {
      const prefix = `${this.uri}/`;
      return [...mockFsState.files]
        .filter((uri) => uri.startsWith(prefix))
        .map((uri) => new MockFile(uri));
    }
  }

  class MockFile {
    uri: string;
    name: string;

    constructor(...parts: (string | MockDirectory)[]) {
      this.uri = joinParts(parts);
      this.name = this.uri.split('/').pop() ?? '';
    }

    get exists() {
      return mockFsState.files.has(this.uri);
    }

    copy(destination: MockFile) {
      mockFsState.files.add(destination.uri);
    }

    delete() {
      mockFsState.files.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: 'file:///document' },
  };
});

const mockWriteAsStringAsync = jest.fn(async (uri: string) => {
  mockFsState.files.add(uri);
});

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...(args as [string])),
}));

import {
  deleteReceiptImage,
  getReceiptImageUri,
  hydrateReceiptImageCache,
  saveReceiptImage,
  saveReceiptImageBase64,
} from '../receiptImageStorage';

describe('receipt image storage', () => {
  beforeEach(() => {
    mockFsState.directories.clear();
    mockFsState.files.clear();
    mockWriteAsStringAsync.mockClear();
    hydrateReceiptImageCache();
  });

  it('copies a temporary image into durable app storage and finds it after hydration', () => {
    const storedUri = saveReceiptImage('tx-1', 'file:///picker/receipt.png');

    expect(storedUri).toBe('file:///document/receipt-images/tx-1.png');
    expect(getReceiptImageUri('tx-1')).toBe(storedUri);

    hydrateReceiptImageCache();
    expect(getReceiptImageUri('tx-1')).toBe(storedUri);
  });

  it('falls back to jpg for content URIs and removes the file with the transaction', () => {
    const storedUri = saveReceiptImage('tx-2', 'content://camera/12345');
    expect(storedUri).toBe('file:///document/receipt-images/tx-2.jpg');

    deleteReceiptImage('tx-2');
    hydrateReceiptImageCache();
    expect(getReceiptImageUri('tx-2')).toBeUndefined();
  });

  it('writes picker base64 directly without reopening an Android content URI', async () => {
    const storedUri = await saveReceiptImageBase64(
      'tx-3',
      'data:image/png;base64,AQID',
      'image/png',
    );

    expect(storedUri).toBe('file:///document/receipt-images/tx-3.png');
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      storedUri,
      'AQID',
      { encoding: 'base64' },
    );
    expect(getReceiptImageUri('tx-3')).toBe(storedUri);
  });
});
