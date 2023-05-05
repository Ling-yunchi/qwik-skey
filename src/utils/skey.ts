import { MD5 } from "crypto-js";

export function md5(s: string): string {
  return MD5(s).toString();
}

export function getSeed(): string {
  return md5(Date.now().toString());
}

export function skeyHash(s: string): string {
  const md5 = MD5(s).words;
  const res_left = md5.slice(0, 16);
  const res_right = md5.slice(16);
  let res = "";
  for (let i = 0; i < 16; i++) {
    res += res_left[i] ^ res_right[i];
  }
  return res;
}

export function generateKeys(str: string, seed: string, n: number): string[] {
  const res = [];
  let s = skeyHash(str + seed);
  for (let i = 0; i < n; i++) {
    s = md5(s);
    res.push(s);
  }
  return res.reverse();
}
