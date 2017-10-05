import idb from 'idb';

var dbPromise = idb.open('test-db', 4, function(upgradeDb) {
  var peopleStore;
  switch (upgradeDb.oldVersion) {
    // don't want breaks so if browser doesn't have anything, it will start at 0 else start later
    /* eslint no-fallthrough:[0] */
    case 0:
      var keyValStore = upgradeDb.createObjectStore('keyval');
      keyValStore.put("world", "hello");
    case 1:
      upgradeDb.createObjectStore('people', {keyPath: 'name'});
    case 2:
      peopleStore = upgradeDb.transaction.objectStore('people');
      peopleStore.createIndex('animal', 'favoriteAnimal');
    case 3:
      peopleStore = upgradeDb.transaction.objectStore('people');
      peopleStore.createIndex('age', 'age');
  }

  // create an index on 'people' named 'age', ordered by 'age'

});

// read "hello" in "keyval"
dbPromise.then(function(db) {
  var tx = db.transaction('keyval');
  var keyValStore = tx.objectStore('keyval');
  return keyValStore.get('hello');
}).then(function(val) {
  console.log('The value of "hello" is:', val);
});

// set "foo" to be "bar" in "keyval"
dbPromise.then(function(db) {
  var tx = db.transaction('keyval', 'readwrite');
  var keyValStore = tx.objectStore('keyval');
  keyValStore.put('bar', 'foo');
  return tx.complete;
}).then(function() {
  console.log('Added foo:bar to keyval');
});

dbPromise.then(function(db) {
  // TODO: in the keyval store, set
  // "favoriteAnimal" to your favourite animal
  // eg "cat" or "dog"
  var tx = db.transaction('keyval', 'readwrite');
  var keyValStore = tx.objectStore('keyval');
  keyValStore.put('cat', 'favoriteAnimal');
  return tx.complete;
}).then(function() {
  console.log('Added favoriteAnimal:cat to keyval');
});

dbPromise.then(function(db) {
  var tx = db.transaction('people', 'readwrite');
  var peopleStore = tx.objectStore('people');
  peopleStore.put({
    name: 'Sam Munoz',
    age: 25,
    favoriteAnimal: 'dog'
  });
  peopleStore.put({
    name: 'Samasdf Munoz',
    age: 23,
    favoriteAnimal: 'cat'
  });
  peopleStore.put({
    name: 'Sam Munasfdoz',
    age: 26,
    favoriteAnimal: 'cat'
  });
  peopleStore.put({
    name: 'Samsafdfad Musdsnoz',
    age: 22,
    favoriteAnimal: 'dog'
  });
  return tx.complete;
}).then(function() {
  console.log('Added people');
});

dbPromise.then(function(db) {
  var tx = db.transaction('people');
  var peopleStore = tx.objectStore('people');
  var animalIndex = peopleStore.index('animal');
  // return peopleStore.getAll();
  // return animalIndex.getAll(); // fetch all by index
  return animalIndex.getAll('cat'); // only return 'cat' animal index
}).then(function(people) {
  console.log('Cat People:', people);
});

dbPromise.then(function(db) {
  var tx = db.transaction('people');
  var peopleStore = tx.objectStore('people');
  var ageIndex = peopleStore.index('age');
  return ageIndex.getAll();
}).then(function(people) {
  console.log('People by age:', people);
});

dbPromise.then(function(db) {
  var tx = db.transaction('people');
  var peopleStore = tx.objectStore('people');
  var ageIndex = peopleStore.index('age');
  return ageIndex.openCursor();
}).then(function logPerson(cursor) {
  if (!cursor) {
    return; // no results
  }
  console.log('Cursored at:', cursor.value.name);
  // cursor.update(newValue) to change the value
  // cursor.delete() to remove it
  // cursor.advance(2) to skip 2 items
  return cursor.continue()
    .then(logPerson);
}).then(function() {
  console.log('Done cursoring');
});
