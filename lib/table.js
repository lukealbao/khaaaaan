'use strict';

var debug = require('util').debuglog('table');

function predicatize (map) {
  return function predicate (instance) {
    var ok = true;
    for (var key in map) {      
      if (instance[key] !== map[key]) {
        ok = false;
        break;
      }
    }
    return ok;
  }
}

function Table (attributes) {
  this.nextId = 0;
  this.collection = {};
  this.attributes = attributes;
}

Table.prototype.create = function (instance) {
  instance.id = ++this.nextId;
  this.collection[instance.id] = instance;
  return instance;
};

Table.prototype.del = function (id) {
  return (delete this.collection[id]);
};

Table.prototype.update = function (where, values) {
  debug('update(%j)', where);
  var self = this;
  var instances = self.select(where);

  instances.forEach(function (instance) {    
    for (var val in values) instance[val] = values[val];
  });

  return instances;
};

Table.prototype.select = function (where) {
  var predicate = predicatize(where);
  var matches = [];
  for (var id in this.collection) {
    var instance = this.collection[id];
    if (predicate(instance)) matches.push(instance);
  }
  return matches;
};

Table.prototype.selectOne = function (where) {
  var all = this.select(where);
  if (all.length === 0) return null;
  return all[0];
};

module.exports = Table;
