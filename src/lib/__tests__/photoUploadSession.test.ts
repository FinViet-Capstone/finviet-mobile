import {
  createPhotoUploadSession,
  deletePhotoUploadSession,
  getPhotoUploadSession,
} from '../photoUploadSession';

describe('photo upload session', () => {
  it('keeps the large picker payload out of router parameters and releases it', () => {
    const photos = [{
      uri: 'content://picker/receipt',
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      base64: 'AQID',
    }];

    const sessionId = createPhotoUploadSession(photos);

    expect(sessionId).not.toContain('AQID');
    expect(getPhotoUploadSession(sessionId)).toBe(photos);
    deletePhotoUploadSession(sessionId);
    expect(getPhotoUploadSession(sessionId)).toEqual([]);
  });
});
