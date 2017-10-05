// var staticCacheName = 'wittr-static-**versioning**';
var staticCacheName = 'wittr-static-5';
self.addEventListener('install', function(event) {
  // cache /skeleton rather than the root page
  var urlsToCache = [
    '/skeleton',
    // '/',
    // 'js/main-**versioning**.js',
    // 'css/main-**versioning**.css',
    // 'imgs/icon-**versioning**.png',
    'js/main.js',
    'css/main.css',
    'imgs/icon.png',
    'https://fonts.gstatic.com/s/roboto/v15/2UX7WLTfW3W8TclTUvlFyQ.woff',
    'https://fonts.gstatic.com/s/roboto/v15/d-6IYplOFocCacKzxwXSOD8E0i7KZn-EPnyo3HZu7kw.woff'
  ];
  //if (event.request.url)
  event.waitUntil(
    caches.open(staticCacheName)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function(event) {
  // event.waitUntil(
  //   caches.delete('wittr-static-v1')
  // );
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
            return cacheName.startsWith('wittr-') && cacheName !== staticCacheName;
          }).map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      })
  );
});

self.addEventListener('fetch', function(event) {
  // console.log(event.request);
  // if (event.request.url.endsWith('.jpg')) {
  //   event.respondWith(
  //     // new Response('Hello <b class="a-winner-is-me">world</b>', {
  //     //   headers: {'Content-Type': 'text/html'}
  //     // })
  //     fetch('imgs/dr-evil.gif')
  //   );
  // }
  // event.respondWith(
  //   fetch(event.request)
  //     .then(function(response) {
  //       if (response.status === 404) {
  //         //return new Response('Whoops, not found');
  //         return fetch('imgs/dr-evil.gif');
  //       }
  //       return response;
  //     })
  //     .catch(function() {
  //       return new Response('Uh oh, totally failed');
  //     })
  // );

  // respond to requests for the root page with page skeleton from cache

  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if(requestUrl.pathname === '/') {
      event.respondWith(caches.match('/skeleton'));
      return;
    }
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// listen for message event and call skip waiting if you get appropriate message
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
