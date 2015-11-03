# Useful Collection Hooks
A less invasive, simpler, & safer way to hook into your collections.

**WIP: This package is a work in progress, not all documented features have been implemented, and the package may not yet be published.**

##Features

1. Works with all collection methods
2. Doesn't break other packages which interact with `Mongo.Collection.prototype`
3. Works in older browsers
4. Works client & server side
5. Detects & throws on circular hooks

##Getting Started

1. Add the package:

    ```
    meteor add useful:collection-hooks
    ```

2. Add some hooks:

    ```js
    var Books = new Mongo.Collection('books');
    Books.hooks({
      'before.insert': function (doc) {
        doc.createdAt = new Date();
      }
    });
    ```

##API

The api is very simple:

- `collection.hooks(hooks)` Attaches each hook in the object `hooks`
- `collection.hook(eventName, fn)` Attaches a single hook:
    + `eventName` the name of your hook, should be either 'before' or 'after' followed by a period and the name of the method you wish to hook, e.g. `before.insert` or `after.update`, you can use any method which exists on the collection.
    + `fn` your hook, will be called with the same arguments passed to the original function, less any callback. Throwing an error from a before hook will stop the method and pass your error to the caller.

##Notes

1. Because we want this package to be as minimally invasive & as predictable as possible, we don't provide any sugar for interacting with the documents & other arguments passed to the methods you hook.
2. Instead we recomend using the useful collection mocks package to accurately simulate the effect of a method, after which you can easily modify the arguments, throw an error or perform any other appropriate action.
