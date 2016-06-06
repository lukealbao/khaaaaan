'use strict';

var debug = require('util').debuglog('app');
var Model = require(__dirname + '/model');

function API () {
  this.model = new Model();
};

/*
 ********************************************************************
 *                                                                  *
 * Private helper functions. You might not be interested in these.  *
 *                                                                  *
 ********************************************************************
 */
function noop () {}

// Bind to UserInstance :: (Null) -> Array(UserInstance)
function getUsersEdges () {
  var id = this.id;
  var self = this;
  
  return self.model.Edges.select({tutorId: id})
         .map(function getTutee (edge) {
           return self.model.Users.selectOne({id: edge.tuteeId});
         })
         .concat(self.model.Edges.select({tuteeId: id})
                 .map(function getTutor (edge) {
                   return self.model.Users.selectOne({id: edge.tutorId});
                 }));
}

// userBfs :: (UserInstance, Function, Function, Function) -> Null
function userBfs (seed, onDiscover, onEdge, onFinish) {
  onDiscover = onDiscover || noop;
  onEdge = onEdge || noop;
  onFinish = onFinish || noop;

  var queue = [seed];
  var discovered = [];
  var user;
  while ((user = queue.shift())) {
    if (discovered.indexOf(user.id) !== -1) continue;
    debug('While loop user: %s', user.name);
    discovered.push(user.id);
    onDiscover(user);
    
    user.getEdges().map(function (friend) {
      onEdge(user, friend);
      return friend;
    }).filter(function (friend) {
      return (discovered.indexOf(friend.id) === -1);
    }).forEach(function (friend) {
      queue.push(friend);
    });

    onFinish(user);    
  }
}

// hasPath (UserInstance, Number) -> Boolean
function hasPath (from, to) {
  debug('hasPath(%s -> %d) ? on %j', from.name, to,
        from.getEdges().map(function (friend) { return friend.id}));
  var path = false;
  var queue = [from];
  var discovered = [];
  var user;

  if (from.id === to) return (path = true);

  while ((user = queue.shift())) {
    if (discovered.indexOf(user.id) !== -1) continue;
    discovered.push(user.id);

    var friends = user.getEdges();
    for (var i = 0, len = friends.length; i < len; i++) {
      var friend = friends[i];
      if (friend.id === to) {
        path = true;
        break;
      }

      discovered.push(friend.id);
      queue.push(friend);      
    }
    
  }
  
  return path;
}

// avgCliqueSize :: (Model) -> Number
function avgCliqueSize (model) {
  var totalUsers = Object.keys(model.Users.collection).length;
  var totalCliques = Object.keys(model.Cliques.collection)
                     .map(function (id) {
                       return model.Cliques.selectOne({id: id});
                     })
                     .map(function (clique) {
                       return clique.count;
                     })
                     .reduce(function (a, b) {
                       return a + b
                     }, 0);

  return totalUsers / totalCliques;  
}


/*
 ********************************************************************
 *                                                                  *
 *                          Public API                              *
 *                                                                  *
 ********************************************************************
 */


API.prototype.addUser = function (user) {
  var instance = this.model.Users.create(user);
  instance.clique = instance.id;
  instance.getEdges = getUsersEdges.bind(instance);
  instance.model = this.model; // kludge for user.getEdges

  this.model.Cliques.create({root: instance.id, count: 1});
  return instance;
};

API.prototype.addEdge = function (tutorId, tuteeId) {
  var tutor = this.model.Users.selectOne({id: tutorId});
  var tutee = this.model.Users.selectOne({id: tuteeId});
  
  var edge = this.model.Edges.create({
    tutorId: tutorId, tuteeId: tuteeId
  });

  var tutorClique = this.model.Cliques.selectOne({root: tutor.clique});
  var tuteeClique = this.model.Cliques.selectOne({root: tutee.clique});

  if (tutorClique === tuteeClique) return edge;

  debug('tutor(%s) ? tutee(%s)', tutorClique.count, tuteeClique.count);
  if (tutorClique.count < tuteeClique.count) {
    this.model.Users.update({clique: tutorClique.root}, {clique: tuteeClique.root});
    tuteeClique.count += tutorClique.count;
    
    this.model.Cliques.del(tutorClique.id);
    debug('tutor(%s) < tutee(%s)', tutorClique.count, tuteeClique.count);
  } else {
    this.model.Users.update({clique: tuteeClique.root}, {clique: tutorClique.root});
    tutorClique.count += tuteeClique.count;
    
    this.model.Cliques.del(tuteeClique.id);
    debug('tutor(%s) > tutee(%s)', tutorClique.count, tuteeClique.count);
  }

  return edge;
};

API.prototype.cutEdge = function (id) {
  var self = this;
  var edge = this.model.Edges.selectOne({id: id});
  var tutor = this.model.Users.selectOne({id: edge.tutorId});
  var tutee = this.model.Users.selectOne({id: edge.tuteeId});
  var oldClique;
  var newClique;
  debug('Clique %d: Cut edge %d between %s(%d) & %s(%d)', tutor.clique, id,
        tutor.name, tutor.id, tutee.name, tutee.id);

  var success = this.model.Edges.del(id);

  if (!hasPath(tutor, tutee.clique)) {
    debug('Rerooting %s %d -> %d', tutor.name, tutor.clique, tutor.id);
    tutor.clique = tutor.id;
    oldClique = self.model.Cliques.selectOne({root: tutee.id});
    newClique = self.model.Cliques.create({root: tutor.id, count: 0});
    userBfs(tutor, null, null, function (user) {
      debug('bfsOnFinish: user %s %d -> %d', user.name, user.clique, tutor.clique);
      user.clique = newClique.root;
      oldClique.count -= 1;
      newClique.count += 1;
    });
  }

  if (!hasPath(tutee, tutor.clique)) {    
    debug('Rerooting %s %d -> ', tutee.name, tutee.clique, tutee.id);
    tutee.clique = tutee.id;
    oldClique = self.model.Cliques.selectOne({id: tutor.id});
    newClique = self.model.Cliques.create({root: tutee.id, count: 0});
    userBfs(tutee, null, null, function (user) {
      debug('bfsOnFinish: user %s %d -> %d', user.name, user.clique, tutee.clique);
      user.clique = newClique.root;
      oldClique.count -= 1;
      newClique.count += 1;
    });
  }

  return success;
};



API.prototype.totalInfection = function (user, version) {  
  return this.model.Users.update({clique: user.clique}, {version: version});
};

API.prototype.limitedInfection = function (nUsers, version) {
  var nCliques = Math.floor(nUsers / avgCliqueSize(this.model));
  var tableSize = Object.keys(this.model.Cliques.collection).length;
  var clique;
  var root;

  for (var i = 0, id; i < nCliques; i++) {
    id = Math.floor(Math.random() * tableSize);
    clique = this.model.Cliques.select({id: clique});
    root = clique.root;

    this.model.Users.update({clique: root}, {version: version});
  }
};

module.exports = API;

