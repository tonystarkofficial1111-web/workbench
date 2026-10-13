/** Base64 helpers (original wbB64): use native btoa/atob, with a hand-rolled fallback. */
const K = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const wbB64 = {
  enc(s: string): string {
    try {
      return window.btoa(s);
    } catch {
      const bytes: number[] = [];
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
        else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
      let r = "", j = 0;
      while (j < bytes.length) {
        const a = bytes[j++] || 0, b = bytes[j++] || 0, c = bytes[j++] || 0;
        r += K[a >> 2]! + K[((a & 3) << 4) | (b >> 4)]! + K[((b & 15) << 2) | (c >> 6)]! + K[c & 63]!;
      }
      return r;
    }
  },
  dec(s: string): string {
    try {
      return window.atob(s);
    } catch {
      s = s.replace(/[^A-Za-z0-9+/]/g, "");
      const bytes: number[] = [];
      let i = 0;
      while (i < s.length) {
        const v1 = K.indexOf(s[i++]!), v2 = K.indexOf(s[i++]!), v3 = K.indexOf(s[i++]!), v4 = K.indexOf(s[i++]!);
        bytes.push((v1 << 2) | (v2 >> 4), ((v2 & 15) << 4) | (v3 >> 2), ((v3 & 3) << 6) | v4);
      }
      let r = "", j = 0;
      while (j < bytes.length) {
        const b = bytes[j++]!;
        if (b < 128) r += String.fromCharCode(b);
        else if (b >= 192 && b < 224) r += String.fromCharCode(((b & 31) << 6) | ((bytes[j++] || 0) & 63));
        else r += String.fromCharCode(((b & 15) << 12) | (((bytes[j++] || 0) & 63) << 6) | ((bytes[j++] || 0) & 63));
      }
      return r;
    }
  },
};
