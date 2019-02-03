'use strict';

const assert = require('assert');
const events = require('events');
const storeMocks = require('../mocks/stores');
const ServiceLocator = require('catberry-locator');
const StoreDispatcher = require('../../lib/StoreDispatcher');

const testUtils = require('../utils');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/StoreDispatcher', function() {
  describe('#getStoreData', function() {
    it('should properly get store data', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncDataStore,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((data) => assert.strictEqual(data, stores.store1.name))
        .then(done)
        .catch(done);
    });

    it('should properly get store data asynchronously', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.AsyncDataStore,
        },
      };

      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((data) => assert.strictEqual(data, stores.store1.name))
        .then(done)
        .catch(done);
    });

    it('should properly get store data from $context', function(done) {
      class Store1 {
        load() {
          return this.$context.getStoreData('store2');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store1,
        },
        store2: {
          name: 'store2',
          constructor: storeMocks.SyncDataStore,
        },
      };

      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((data) => assert.strictEqual(data, 'store2'))
        .then(done)
        .catch(done);
    });

    it('should return null if store name equals current in $context', function(done) {
      class Store1 {
        load() {
          return this.$context.getStoreData('store1');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store1,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((data) => assert.strictEqual(data, null))
        .then(done)
        .catch(done);
    });

    it('should pass error from store', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncErrorStore,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, context);
      dispatcher.getStoreData(stores.store1.name)
        .then(() => done(new Error('Should fail')))
        .catch((reason) => assert.strictEqual(reason.message, stores.store1.name))
        .then(done)
        .catch(done);
    });

    it('should pass error from store asynchronously', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.AsyncErrorStore,
        },
      };

      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then(() => done(new Error('Should fail')))
        .catch((reason) => assert.strictEqual(reason.message, stores.store1.name))
        .then(done)
        .catch(done);
    });

    it('should return null if store name is not a string', function(done) {
      const locator = createLocator({});
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(100500)
        .then((data) => assert.strictEqual(data, null))
        .then(done)
        .catch(done);
    });

    it('should reject promise if there is no such store', function(done) {
      const locator = createLocator({});
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData('wrong')
        .then(() => done(new Error('Should fail')))
        .catch((reason) => assert.strictEqual(reason.message, 'Store "wrong" not found'))
        .then(done)
        .catch(done);
    });

    it('should not invoke store\'s load method many times concurrently', function(done) {
      let counter = 0;

      class Store {
        load() {
          counter++;
          return testUtils.wait(1).then(() => 'hello');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, context);
      Promise.all([
        dispatcher.getStoreData(stores.store1.name),
        dispatcher.getStoreData(stores.store1.name),
        dispatcher.getStoreData(stores.store1.name),
        dispatcher.getStoreData(stores.store1.name),
        dispatcher.getStoreData(stores.store1.name),
      ])
        .then((results) => {
          assert.strictEqual(counter, 1);
          results.forEach((result) => assert.strictEqual(result, 'hello'));
        })
        .then(done)
        .catch(done);
    });

    it('should not invoke store\'s load method if store is not changed', function(done) {
      let counter = 0;

      class Store {
        load() {
          counter++;
          return testUtils.wait(1).then(() => 'hello');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((result) => {
          assert.strictEqual(result, 'hello');
          return dispatcher.getStoreData(stores.store1.name);
        })
        .then((result) => {
          assert.strictEqual(counter, 1);
          assert.strictEqual(result, 'hello');
        })
        .then(done)
        .catch(done);
    });

    it('should invoke store\'s load method if store is changed', function() {
      let counter = 0;
      let actualStoreInstanceId;

      class Store {
        load() {
          actualStoreInstanceId = this.$context.instanceId;
          counter++;
          testUtils.wait(5)
            .then(() => {
              if (counter !== 1) {
                return;
              }
              this.$context.changed();
            });
          return Promise.resolve('hello');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };
      const locator = createLocator(stores);
      const eventBus = locator.resolve('eventBus');
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});

      const thenStoreChanged = new Promise((resolve) => eventBus.on('storeChanged', resolve))

      return dispatcher.getStoreData(stores.store1.name)
        .then((result) => {
          assert.strictEqual(counter, 1);
          assert.strictEqual(result, 'hello');

          return thenStoreChanged;
        })
        .then((storeInstance) => {
          assert.strictEqual(storeInstance, actualStoreInstanceId);

          return dispatcher.getStoreData(stores.store1.name);
        })
        .then((result) => {
          assert.strictEqual(counter, 2);
          assert.strictEqual(result, 'hello');
        });
    });

    it('should invoke store\'s load method if store is changed after state changing', function() {
      let counter = 0;
      let actualStoreInstance;

      class Store {
        load() {
          actualStoreInstance = this.$context.instanceId;
          counter++;
          return testUtils.wait(1).then(() => 'hello');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };

      const locator = createLocator(stores);
      const eventBus = locator.resolve('eventBus');
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});

      const thenStoreChanged = new Promise((resolve) => eventBus.on('storeChanged', resolve));
      return dispatcher.getStoreData(stores.store1.name)
        .then((result) => {
          assert.strictEqual(counter, 1);
          assert.strictEqual(result, 'hello');

          dispatcher.setState({
            store1: {},
          }, context);

          return thenStoreChanged;
        })
        .then((storeInstance) => {
          assert.strictEqual(storeInstance, actualStoreInstance);

          return dispatcher.getStoreData(stores.store1.name);
        })
        .then((result) => {
          assert.strictEqual(counter, 2);
          assert.strictEqual(result, 'hello');
        });
    });

    it('should emit store\'s changed for dependant store', function(done) {
      const loads = [];
      let store3InstanceId;

      class Store1 {
        load() {
          loads.push(this.$context.name);

          if (loads.length === 1) {
            testUtils.wait(1).then(() => this.$context.changed());
          }

          return Promise.resolve('hello');
        }
      }

      class Store2 {
        constructor() {
          this.$context.setDependency('store1');
        }

        load() {
          loads.push(this.$context.name);
        }
      }

      class Store3 {
        constructor() {
          store3InstanceId = this.$context.instanceId;
          this.$context.setDependency('store2');
        }

        load() {
          loads.push(this.$context.name);
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store1,
        },
        store2: {
          name: 'store2',
          constructor: Store2,
        },
        store3: {
          name: 'store3',
          constructor: Store3,
        },
      };
      const locator = createLocator(stores);
      const eventBus = locator.resolve('eventBus');
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      Promise
        .all([
          dispatcher.getStoreData(stores.store1.name),
          dispatcher.getStoreData(stores.store2.name),
          dispatcher.getStoreData(stores.store3.name),
        ])
        .catch(done);

      eventBus.on('storeChanged', function(instanceId) {
        if (instanceId !== store3InstanceId) {
          return [];
        }

        return Promise
          .all([
            dispatcher.getStoreData(stores.store1.name),
            dispatcher.getStoreData(stores.store2.name),
            dispatcher.getStoreData(stores.store3.name),
          ])
          .then(() => {
            assert.strictEqual(loads[0], 'store1');
            assert.strictEqual(loads[1], 'store2');
            assert.strictEqual(loads[2], 'store3');
            assert.strictEqual(loads[3], 'store1');
            assert.strictEqual(loads[4], 'store2');
            assert.strictEqual(loads[5], 'store3');
          })
          .then(done)
          .catch(done);
      });
    });

    it('should not cache store\'s data if there was an error loading data', function(done) {
      let counter = 0;

      class Store {
        load() {
          counter++;
          if (counter === 1) {
            throw new Error('error');
          }
          return testUtils.wait(1).then(() => 'hello');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .catch((error) => {
          assert.strictEqual(error.message, 'error');
          return dispatcher.getStoreData(stores.store1.name);
        })
        .then((result) => {
          assert.strictEqual(counter, 2);
          assert.strictEqual(result, 'hello');
        })
        .then(done)
        .catch(done);
    });

    it('should cache store\'s data only for it\'s lifetime', function(done) {
      let counter = 0;

      class Store {
        constructor() {
          this.$lifetime = 5;
        }

        load() {
          counter++;
          return testUtils.wait(1).then(() => `hello${counter}`);
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };

      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      dispatcher.getStoreData(stores.store1.name)
        .then((data) => {
          assert.strictEqual(data, 'hello1');
          return testUtils.wait(10);
        })
        .then(() => dispatcher.getStoreData(stores.store1.name))
        .then((result) => {
          assert.strictEqual(counter, 2);
          assert.strictEqual(result, 'hello2');
        })
        .then(done)
        .catch(done);
    });

    it('should reject promise when initial state is not set', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncDataStore,
        },
      };

      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.getStoreData(stores.store1.name)
        .then(() => done(new Error('Should fail')))
        .catch((reason) =>
          assert.strictEqual(reason.message, 'State should be set before any request'))
        .then(done)
        .catch(done);
    });
  });

  describe('#setState', function() {
    it('should set initial state and return empty array', function(done) {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncDataStore,
        },
        store2: {
          name: 'store2',
          constructor: storeMocks.SyncDataStore,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');
      const names = dispatcher.setState({}, {});

      assert.strictEqual(names.length, 0);
      done();
    });

    it('should return names of changed stores', function() {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncDataStore,
        },
        store2: {
          name: 'store2',
          constructor: storeMocks.SyncDataStore,
        },
        store3: {
          name: 'store3',
          constructor: storeMocks.SyncDataStore,
        },
        store4: {
          name: 'store4',
          constructor: storeMocks.SyncDataStore,
        },
        store5: {
          name: 'store5',
          constructor: storeMocks.SyncDataStore,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      const initState = {
        // to remove
        store1: {
          some: 'value',
        },
        // to change value
        store2: {
          some1: 'value1',
          some2: 2,
        },
        // to change count of properties
        store3: {
          some1: 'value1',
          some2: 2,
          some3: true,
        },
        // to keep the same
        store4: {
          some: 'value',
        },
        // store5 is absent at all
      };

      const newState = {
        store2: {
          some1: 'value2',
          some2: 1,
        },
        store3: {
          some1: 'value1',
          some2: 3,
        },
        store4: {
          some: 'value',
        },
        store5: {
          some: 'value',
        },
      };
      const names = dispatcher.setState(initState, context);
      assert.strictEqual(names.length, 0);

      return dispatcher.getStoreData(stores.store2.name)
        .then(() => {
          const newContext = {
            hello: 'world2',
          };
          const updatedInstances = dispatcher.setState(newState, newContext);
          assert.strictEqual(updatedInstances.length, 4);
          assert.deepEqual(updatedInstances.map((i) => dispatcher.getStoreNameByInstanceId(i)).sort(), [
            'store1', 'store2', 'store3', 'store5',
          ]);
        });
    });

    it('should trigger warning if the store does not exist', function(done) {
      const stores = {
        store: {
          name: 'store',
          constructor: storeMocks.SyncDataStore,
        },
      };
      const locator = createLocator(stores);
      const eventBus = locator.resolve('eventBus');
      const dispatcher = locator.resolve('storeDispatcher');

      const initState = {
        wrong: {},
      };

      eventBus
        .once('error', done)
        .once('warn', (message) => {
          try {
            assert.strictEqual(message, 'Store "wrong" does not exist (might be a typo in a route)');
            done();
          } catch (e) {
            done(e);
          }
        });

      dispatcher.setState(initState, context);
    });
  });

  describe('#sendBroadcastAction', function() {
    it('should send action to store if it has handler', function() {
      class Store {
        handleSomeAction(args) {
          return {
            args,
            result: 'result',
          };
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };
      const actionParameters = {};
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      return dispatcher
        .sendBroadcastAction(stores.store1.name, 'some-action', actionParameters)
        .then(([result]) => {
          assert.strictEqual(result.args, actionParameters);
          assert.strictEqual(result.result, 'result');
        });
    });

    it('should send broadcast action from store to store if it has handler', function() {
      class Store1 {
        handleHello(name) {
          return this.$context.sendAction('store2', 'world', name);
        }
      }

      class Store2 {
        handleWorld(name) {
          return `hello, ${name}`;
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store1,
        },
        store2: {
          name: 'store2',
          constructor: Store2,
        },
      };
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});
      return dispatcher
        .sendBroadcastAction(stores.store1.name, 'hello', 'catberry')
        .then(([result]) => assert.strictEqual(result[0], 'hello, catberry'));
    });

    it('should response with undefined if there is no such action handler', function() {
      const stores = {
        store1: {
          name: 'store1',
          constructor: storeMocks.SyncDataStore,
        },
      };
      const actionParameters = {};
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});

      return dispatcher
        .sendBroadcastAction(stores.store1.name, 'some-action', actionParameters)
        .then(([result]) => assert.strictEqual(result, undefined));
    });

    it('should pass error from action handler', function() {
      class Store {
        handleSomeAction() {
          throw new Error('error');
        }
      }

      const stores = {
        store1: {
          name: 'store1',
          constructor: Store,
        },
      };

      const actionParameters = {};
      const locator = createLocator(stores);
      const dispatcher = locator.resolve('storeDispatcher');

      dispatcher.setState({}, {});

      return dispatcher
        .sendBroadcastAction(stores.store1.name, 'some-action', actionParameters)
        .then(() => {
          throw new Error('Should fail');
        })
        .catch((reason) => assert.strictEqual(reason.message, 'error'));
    });
  });
});

function createLocator(stores, config) {
  const locator = new ServiceLocator();
  const eventBus = new events.EventEmitter();
  eventBus.on('error', () => {
  });
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('eventBus', eventBus);
  locator.registerInstance('config', config || {});
  locator.registerInstance('storeLoader', {
    load: () => Promise.resolve(stores),
    getStoresByNames: () => stores,
  });
  locator.register('storeDispatcher', StoreDispatcher);
  return locator;
}
