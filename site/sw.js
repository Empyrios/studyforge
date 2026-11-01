/* Static shell only. Study notes remain outside CacheStorage. */
const CACHE='studyforge-shell-v1';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./domain.mjs','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('studyforge-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith(fetch(event.request).then(res=>{
    if(res.ok&&res.type==='basic'){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}
    return res;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
