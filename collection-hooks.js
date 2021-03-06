var callstack = new Meteor.EnvironmentVariable();
var withStackCheck = function (eventName, fn) {
  var currentStack = callstack.get() || [];
  if (_.contains(currentStack, eventName))
    throw new Error('circular hook!');
  return callstack.withValue(currentStack.concat([eventName]), fn);
};
Mongo.Collection.prototype.hook = function (eventName, hook) {
  var eventParts = eventName.split('.');
  var when = eventParts[0];
  var method = eventParts[1];

  if (when === "*")
    throw new Error('Wildcard for when is not supported');
  if (method === "*")
    throw new Error('Wildcard for method is not yet implemented');

  var collection;
  if (Meteor.isServer) {
    collection = this._collection;
  } else {
    collection = this;
  }

  var self = collection["_useful_hook_" + method];
  if (!self) {
    var original = collection[method];
    self = function () {
      var args = _.toArray(arguments);
      var callback;
      if (_.isFunction(_.last(args)))
        callback = args.pop();

      try {
        return withStackCheck(method, function () {
          _.each(self.before, function (hook) {
            hook.apply(collection, args);
          });

          var originalArgs = args.concat();
          var callhooks = function (result) {
            _.each(self.after, function (hook) {
              try {
                hook.apply(collection, originalArgs.concat([result]));
              } catch (e) {
                // XXX should we swallow this?
                // do we consider the operation to successful, or failed
                // the developer might expect side-effects from the after hook
                // to exist, or they might not...
                // It's really bad practice to write after hooks which can throw
                // errors.
                // error = new Error("Collection hook failed.");
                // error.details = e;
                console.error('Error in collection after hook:', e);
              }
            });
          };

          if (callback) {
            args.push(function (error, result) {
              if (!error)
                callhooks(result);
              callback(error, result);
            });
            return original.apply(collection, args);
          } else {
            var result = original.apply(collection, args);
            callhooks(result);
            return result;
          }
        });        
      } catch (e) {
        if (callback)
          return callback(e);
        else
          throw e;
      } 
    };
    self.before = [];
    self.after = [];
    collection[method] = self;
    collection["_useful_hook_" + method] = self;
  }

  if (when === "before") {
    self.before.push(hook);
  } else if (when === "after") {
    self.after.push(hook);
  } else {
    throw new Error("Unrecognized 'when' portion of hook selector.");
  }

  return self;
};

Mongo.Collection.prototype.hooks = function (hooks) {
  var self = this;
  _.each(hooks, function (hook, eventName) {
    self.hook(eventName, hook);
  });
};