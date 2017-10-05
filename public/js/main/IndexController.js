import PostsView from './views/Posts';
import ToastsView from './views/Toasts';
import idb from 'idb';

function openDatabase() {
  // if browser doesn't support service worker, don't use database
  if (!navigator.serviceWorker) {
    return Promise.resolve();
  }

  // return promise for a database called 'wittr' that conatinas one objectStore 'wittrs'
  // that uses 'id' as its key and has an index called 'by-date', which is sorted by 'time' property

  return idb.open('wittr', 1, function(upgradeDb) {
    switch (upgradeDb.oldVersion) {
      /* eslint no-fallthrough:[0] */
      case 0:
        var wittrStore = upgradeDb.createObjectStore('wittrs', {keyPath: 'id'});
        wittrStore.createIndex('by-date', 'time');
    }
  });

}

export default function IndexController(container) {
  this._container = container;
  this._postsView = new PostsView(this._container);
  this._toastsView = new ToastsView(this._container);
  this._lostConnectionToast = null;
  this._dbPromise = openDatabase();
  this._registerServiceWorker();

  var indexController = this;

  this._showCachedMessages()
    .then(function() {
      indexController._openSocket();
    });
}

IndexController.prototype._registerServiceWorker = function() {
  if (navigator.serviceWorker) {
    var indexController = this;
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) {
        // if there's no controller, this page wasn't loaded via sw, so it's the latest version
        if (!navigator.serviceWorker.controller) {
          return;
        }
        // if there's an updated worker already waiting, show toast
        if (reg.waiting) {
          indexController._updateReady(reg.waiting);
          return;
        }
        // if there's an updated worker installing, track progress
        // if it becomes installed, show toast
        if (reg.installing) {
          indexController._trackInstalling(reg.installing);
          return;
        }
        // listen for new installing workers arriving
        // if one arrives, track progress
        // if it becomes installed, show toast
        reg.addEventListener('updatefound', function() {
          indexController._trackInstalling(reg.installing);
        });

        console.log('Successfully registered');
      })
      .catch(function() {
        console.log('failed to register');
      });

    // listen for controll service worker changing and reload the page
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
  }
};

IndexController.prototype._showCachedMessages = function() {
  var indexController = this;

  return this._dbPromise
    .then(function(db) {
      // if we're already show posts, eg shift-refresh or the very first load, no point in fetching from IDB
      if (!db || indexController._postsView.showingPosts()) {
        return;
      }

      // get all of wittr message object from indexedDB, then pass them to indexController._postsView.addPosts(messages)
      // in order of date, starting with the latest
      // return promise so websocket isn't opened until you're done
      var tx = db.transaction('wittrs');
      var store = tx.objectStore('wittrs');
      var timeIndex = store.index('by-date');
      return timeIndex.getAll();
    })
    .then(function(messages) {
      return indexController._postsView.addPosts(messages.reverse());
    });
};

IndexController.prototype._trackInstalling = function(worker) {
  var indexController = this;
  worker.addEventListener('statechange', function() {
    if (worker.state === 'installed') {
      indexController._updateReady(worker);
    }
  });
};

IndexController.prototype._updateReady = function(worker) {
  var toast = this._toastsView.show('New version available', {
    buttons: ['refresh', 'dismiss']
  });

  toast.answer
    .then(function(answer) {
      if (answer !== 'refresh') {
        return;
      }
      // tell service worker to skipwaiting
      worker.postMessage({action: 'skipWaiting'});
    });
};

// open a connection to the server for live updates
IndexController.prototype._openSocket = function() {
  var indexController = this;
  var latestPostDate = this._postsView.getLatestPostDate();

  // create a url pointing to /updates with the ws protocol
  var socketUrl = new URL('/updates', window.location);
  socketUrl.protocol = 'ws';

  if (latestPostDate) {
    socketUrl.search = 'since=' + latestPostDate.valueOf();
  }

  // this is a little hack for the settings page's tests,
  // it isn't needed for Wittr
  socketUrl.search += '&' + location.search.slice(1);

  var ws = new WebSocket(socketUrl.href);

  // add listeners
  ws.addEventListener('open', function() {
    if (indexController._lostConnectionToast) {
      indexController._lostConnectionToast.hide();
    }
  });

  ws.addEventListener('message', function(event) {
    requestAnimationFrame(function() {
      indexController._onSocketMessage(event.data);
    });
  });

  ws.addEventListener('close', function() {
    // tell the user
    if (!indexController._lostConnectionToast) {
      indexController._lostConnectionToast = indexController._toastsView.show("Unable to connect. Retrying…");
    }

    // try and reconnect in 5 seconds
    setTimeout(function() {
      indexController._openSocket();
    }, 5000);
  });
};

// called when the web socket sends message data
IndexController.prototype._onSocketMessage = function(data) {
  var messages = JSON.parse(data);

  this._dbPromise
    .then(function(db) {
      if (!db) {
        return;
      }
      // put each message into the 'wittrs' object store
      var tx = db.transaction('wittrs', 'readwrite');
      var wittrsStore = tx.objectStore('wittrs');
      messages.forEach(function(message) {
        wittrsStore.put(message);
      });
      return tx.complete;
    });

  this._postsView.addPosts(messages);
};
