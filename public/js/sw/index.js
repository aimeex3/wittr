// var staticCacheName = 'wittr-static-**versioning**';
var staticCacheName = 'wittr-static-6';
var contentImgsCache = 'wittr-content-imgs';
var allCaches = [
  staticCacheName,
  contentImgsCache
];

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
            return cacheName.startsWith('wittr-') && !allCaches.includes(cacheName);
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

    if(requestUrl.pathname.startsWith('/photos/')) {
      event.respondWith(servePhoto(event.request));
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

function servePhoto(request) {
  // /photos/9-3322-33323423423-234234234234-800px.jpg
  // storageUrl stores url without the size (-800px.jpg)
  // store only one copy of each photo
  var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

  // return images from 'wittr-content-imgs' cache if they are there
  // othwerise, fetch images from network, put in cache, and send back to browser
  // cache.put supports a plain url as the first param

  return caches.open(contentImgsCache)
    .then(function(cache) {
      return cache.match(storageUrl)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(function(networkResponse) {
              cache.put(storageUrl, networkResponse.clone());
              return networkResponse;
            });
        });
    });
}

// listen for message event and call skip waiting if you get appropriate message
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
