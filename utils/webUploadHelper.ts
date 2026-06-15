import { decode } from 'base64-arraybuffer';

/**
 * Reads a local URI (such as a blob: or data: URL) and converts it to a standard browser Blob.
 * This is a highly robust solution designed to bypass iOS Safari/WebKit's fetch(blobUrl) bug
 * by using XMLHttpRequest for blob URLs, and manual base64 decoding for data URLs.
 */
export const readLocalUriAsBlob = async (uri: string): Promise<Blob> => {
  if (uri.startsWith('data:')) {
    try {
      const mime = uri.split(';')[0].split(':')[1];
      const base64 = uri.substring(uri.indexOf(',') + 1);
      const buffer = decode(base64);
      return new Blob([buffer], { type: mime });
    } catch (e) {
      // Fallback to XHR if manual parsing fails
      console.warn('Failed to parse data URL manually, falling back to XHR:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 0) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Failed to load local image (status ${xhr.status})`));
      }
    };
    xhr.onerror = function (e) {
      reject(new Error('Failed to load local image (network/XHR error)'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send();
  });
};
