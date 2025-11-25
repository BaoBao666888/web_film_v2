export const DEFAULT_HLS_HEADERS = {
  accept: "*/*",
  "accept-language":
    "vi-VN,vi;q=0.9,zh-CN;q=0.8,zh;q=0.7,fr-FR;q=0.6,fr;q=0.5,en-US;q=0.4,en;q=0.3",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=1, i",
  "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  Referer: "https://goatembed.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

export const getDefaultHlsHeaders = () => ({ ...DEFAULT_HLS_HEADERS });
