/* YG 바이브 코딩 누리집 - 서비스 워커
 *
 * 원칙
 *  1) 프로그램 목록(programs.csv)은 절대 캐시하지 않는다. 항상 최신을 받아온다.
 *  2) 화면 껍데기(index.html, 아이콘)만 캐시해 두어 빠르게 열리게 한다.
 *  3) programs 폴더의 실제 프로그램 파일은 용량이 커서 캐시하지 않는다.
 *
 * 화면을 고친 뒤에는 아래 VERSION 숫자를 올려주세요. (예: v1 → v2)
 * 그래야 선생님들 기기에 남아있던 옛 화면이 새것으로 교체됩니다.
 */
const VERSION = "ygvibe-v1";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .catch(() => {})           // 파일 하나가 없어도 설치는 계속 진행
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 1) 프로그램 목록은 손대지 않음 → 항상 네트워크에서 최신으로
  if (url.pathname.endsWith("programs.csv")) return;

  // 2) programs 폴더 안의 프로그램 파일은 용량이 커서 캐시하지 않음
  if (url.pathname.includes("/programs/")) return;

  // 3) 외부 스크립트(xlsx 라이브러리)는 한 번 받아두고 재사용
  if (url.origin !== location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // 4) 같은 사이트 파일(화면·매뉴얼·아이콘): 네트워크 우선, 실패하면 캐시
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === "navigate") {
        const shell = await caches.match("./index.html");
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
