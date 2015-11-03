Books = new Mongo.Collection('books');


if (Meteor.isServer) {
  Books.remove({});
  Books.insert({
    name: "Huckleberry Finn"
    , author: "Mark Twain"
    , genre: "fiction"
    , kind: "library"
  });
  Books.insert({
    name: "What's Wrong With the World"
    , author: "G K Chesterton"
    , genre: "religion"
    , kind: "personal"
  });
  Meteor.publish('books', function () {
    return Books.find();
  });
  Books.allow({
    insert: function (userId, doc) {
      return true;
    },
    update: function (userId, doc, fields, modifier) {
      return true;
    },
    remove: function (userId, doc) {
      return true;
    }
  });
} else {
  Meteor.subscribe('books');
}


var log = new Mongo.Collection('logs');

if (Meteor.isServer) Meteor.publish('logs', function () {return log.find();});
if (Meteor.isClient) Meteor.subscribe('logs');

var original = Books._collection.insert;

if (Meteor.isServer) {
  log.remove({});

  Books.hooks({
    "before.insert": function (doc) {
      log.insert({
        method: "insert"
        , where: "before"
        , logField: doc.logField
      });
    }
    , "before.update": function (query, modifier) {
      if (modifier && modifier.$set && modifier.$set.logField){
        log.insert({
          method: "update"
          , where: "before"
          , logField: modifier.$set.logField
        });
      }
    }
    , "before.remove": function (query) {
      log.insert({
        method: "remove"
        , where: "before"
        , logField: query._id
      });
    }
    , "after.insert": function (doc) {
      log.insert({
        method: "insert"
        , where: "after"
        , logField: doc.logField
      });
    }
    , "after.update": function (query, modifier) {
      if (modifier && modifier.$set && modifier.$set.logField){
        log.insert({
          method: "update"
          , where: "after"
          , logField: modifier.$set.logField
        });
      }
    }
    , "after.remove": function (query) {
      log.insert({
        method: "remove"
        , where: "after"
        , logField: query._id
      });
    }
  });
}

var logField;

Tinytest.addAsync('UsefulCollections - hooks - before insert', function (test, done) {
  logField = Random.id();
  Books.insert({logField: logField}, function () {
    test.equal(log.find({logField: logField, method: "insert", where: "before"}).count(), 1);
    done();
  });
});

Tinytest.add('UsefulCollections - hooks - after insert', function (test) {
  test.equal(log.find({
    logField: logField
    , where: 'after'
    , method: 'insert'
  }).count(), 1);
});

Tinytest.addAsync('UsefulCollections - hooks - before update', function (test, done) {
  logField = Random.id();
  var doc = Books.findOne({logField: {$exists: true}});
  Books.update(doc._id, {$set:{logField: logField}}, function () {
    test.equal(log.find({logField: logField, method: "update", where: "before"}).count(), 1);
    done();
  });
});

Tinytest.add('UsefulCollections - hooks - after update', function (test) {
  test.equal(log.find({
    logField: logField
    , where: 'after'
    , method: 'update'
  }).count(), 1);
});

var docRemoved;

Tinytest.addAsync('UsefulCollections - hooks - before remove', function (test, done) {
  logField = Random.id();
  docRemoved = Books.findOne({logField: {$exists: true}});
  Books.remove(docRemoved._id, function () {
    test.equal(log.find({
      logField: docRemoved._id
      , method: "remove"
      , where: "before"
    }).count(), 1);
    done();
  });
});

Tinytest.add('UsefulCollections - hooks - after remove', function (test) {
  test.equal(log.find({
    logField: docRemoved._id
    , where: 'after'
    , method: 'remove'
  }).count(), 1);
});

Tinytest.add('UsefulCollections - hooks - local hooks run syncronously', function (test) {
  var counter = {};
  var hooks = {};
  var hookNames = [
    "before.insert"
    , "before.update"
    , "before.remove"
    , "after.insert"
    , "after.update"
    , "after.remove"
  ];
  _.each(hookNames, function (hook) {
    hooks[hook] = function () {
      counter[hook] = counter[hook] || 0 + 1;
    };
  });
  Books.hooks(hooks);

  var logField = Random.id();
  var docId = Books.insert({
    logField: logField
  });
  Books.update(docId, {
    $set: {
      changed: true
    }
  });
  Books.remove(docId);
  test.equal(counter, {
    "before.insert": 1
    , "before.update": 1
    , "before.remove": 1
    , "after.insert": 1
    , "after.update": 1
    , "after.remove": 1
  });
});

if (Meteor.isServer) {
  Tinytest.addAsync('UsefulCollections - hooks - survives monkey patch', function (test, done) {
    var original = Books._collection.insert;
    var patch;
    logField = Random.id();

    Books._collection.insert = patch = function (doc) {
      return original.apply(Books._collection, arguments);
    };
    Books.hooks({
      "before.insert": function (doc) {
        log.insert({
          logField: doc.logField
          , method: "mokeypatch"
          , where: "before"
        });
      }
      , "after.insert": function (doc) {
        log.insert({
          logField: doc.logField
          , method: "mokeypatch"
          , where: "after"
        });
      }
    });
    test.equal(Books._collection.insert, patch);
    Books.insert({logField: logField}, function () {
      test.equal(log.find({logField: logField, method: "mokeypatch", where: "before"}).count(), 1);
      test.equal(log.find({logField: logField, method: "mokeypatch", where: "after"}).count(), 1);
      done();
    });
  });
  Tinytest.addAsync('UsefulCollections - hooks - patches users collection', function (test, done) {
    var original = Books._collection.insert;
    var patch;
    logField = Random.id();
    Meteor.users.hooks({
      "before.insert": function (doc) {
        log.insert({
          logField: doc.logField
          , method: "users"
          , where: "before"
        });
      }
      , "after.insert": function (doc) {
        log.insert({
          logField: doc.logField
          , method: "users"
          , where: "after"
        });
      }
    });
    Meteor.users.insert({logField: logField}, function () {
      test.equal(log.find({logField: logField, method: "users", where: "before"}).count(), 1);
      test.equal(log.find({logField: logField, method: "users", where: "after"}).count(), 1);
      Meteor.users.remove({logField: logField});
      done();
    });
  });
}