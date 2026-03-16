export interface IStorageService {
  /**
   * Upload a file buffer to the configured storage backend.
   * @returns the storage key (path) of the uploaded object
   */
  uploadFile(buffer: Buffer, key: string, mimeType: string, sizeBytes: number): Promise<string>;

  /**
   * Generate a pre-signed (or local) download URL for the given key.
   * @param key            storage key returned by uploadFile
   * @param expiresInSeconds  expiry in seconds (default 3600)
   */
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Permanently remove an object from storage.
   */
  deleteObject(key: string): Promise<void>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
