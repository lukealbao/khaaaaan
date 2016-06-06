'use strict';

var Table = require(__dirname + '/lib/table');

module.exports = function () {
  this.Users =  new Table(['name', 'clique', 'version']);
  this.Edges = new Table(['tutor', 'tutee']);
  this.Cliques = new Table(['count', 'root']);
};
