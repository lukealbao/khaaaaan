var debug = require('util').debuglog('state');

function randomInt (min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  var window = max - min;
  return Math.floor(Math.random() * window) + min;
}

function createRandomEdge (user, app) {
  var numUsers = Object.keys(app.model.Users.collection).length;
  var friendId = randomInt(1, numUsers);

  debug('Creating edge %j -> %j', user.id, friendId);
  return app.addEdge(user.id, friendId);
}

function setupState (app, nUsers, nEdges) {
  for (var i = 0; i < nUsers; i++) {    
    app.addUser({name: 'Malkovich', version: '0.1.0'});
  }

  var interval = Math.floor(nUsers / nEdges);

  // create edges for only half the users
  for (i = 1; i <= nUsers; i += interval) {
    var user = app.model.Users.selectOne({id: i});
    createRandomEdge(user, app);
  }
  debug('Created %d users', i);
}

function tearDownState (app) {
  for (var table in app.model) {
    app.model[table].collection = {};
    app.model[table].nextId = 0;
  }
}

module.exports = {
  setup: setupState,
  teardown: tearDownState
};
