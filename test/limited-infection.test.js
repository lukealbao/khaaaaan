var App = require(__dirname + '/../app');
var app = new App();
var state = require(__dirname + '/helper/generate-data.js');
var TestSuite = require(__dirname + '/helper/success-rate.js');

var suite = new TestSuite();

suite.use(new Array(10), new Array(10));
suite.test('Infects 10% of 1000 users with average 1 edges each', function (t) {
  state.setup(app, 1000, 1);
  var cliques = app.model.Cliques.select();
  // console.log('\n\t-- Test --');
  // console.log('Total number cliques: %d', cliques.length);
  // console.log('Largest clique size: %d', cliques.sort(function (a,b) {
  //               return a.count - b.count;
  //             }).pop().count);

  app.limitedInfection(100, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
  // console.log('Infected %d users', betaUsers.length);
  t.assert(betaUsers.length > 90 && betaUsers.length < 110);
});

suite.test('Infects 10% of 1000 users with average 2 edges each', function (t) {
  state.setup(app, 1000, 2);
  var cliques = app.model.Cliques.select();
  // console.log('\n\t-- Test --');
  // console.log('Total number cliques: %d', cliques.length);
  // console.log('Largest clique size: %d', cliques.sort(function (a,b) {
  //               return a.count - b.count;
  //             }).pop().count);

  app.limitedInfection(100, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
  // console.log('Infected %d users', betaUsers.length);
  t.assert(betaUsers.length > 90 && betaUsers.length < 110);
});

suite.teardown(function () {
  state.teardown(app);
});

suite.run();
