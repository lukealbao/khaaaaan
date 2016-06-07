var App = require(__dirname + '/../app');
var app = new App();
var state = require(__dirname + '/helper/generate-data.js');
var TestSuite = require(__dirname + '/helper/success-rate.js');

var suite = new TestSuite();

suite.use(new Array(10), new Array(10));
suite.test('Infects 1% of 5,000 users on 50 edges ± 0.1%', function (t) {
  var users = 5000;
  var edges = 50;
  var targetPercentage = .01;
  var e = .001;
  
  var targetUsers = Math.floor(users * targetPercentage);
  var min = users * (targetPercentage - e);
  var max = users * (targetPercentage + e);
  state.setup(app, users, edges);  
  
  app.limitedInfection(targetUsers, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
              
  t.assert(betaUsers.length > min && betaUsers.length < max);
});

suite.test('Infects 10% of 5,000 users on 50 edges ± 1%', function (t) {
  var users = 5000;
  var edges = 50;
  var targetPercentage = .1;
  var e = .01;
  
  var targetUsers = Math.floor(users * targetPercentage);
  var min = users * (targetPercentage - e);
  var max = users * (targetPercentage + e);
  state.setup(app, users, edges);  
  
  app.limitedInfection(targetUsers, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
              
  t.assert(betaUsers.length > min && betaUsers.length < max);
});

suite.test('Infects 10% of 5,000 users on 100 edges ± 1%', function (t) {
  var users = 5000;
  var edges = 100;
  var targetPercentage = .1;
  var e = .01;
  
  var targetUsers = Math.floor(users * targetPercentage);
  var min = users * (targetPercentage - e);
  var max = users * (targetPercentage + e);
  state.setup(app, users, edges);
  
  app.limitedInfection(targetUsers, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
              
  t.assert(betaUsers.length > min && betaUsers.length < max);
});

suite.test('Infects 50% of 5,000 users on 50 edges ± 5%', function (t) {
  var users = 5000;
  var edges = 50;
  var targetPercentage = .1;
  var e = .05;
  
  var targetUsers = Math.floor(users * targetPercentage);
  var min = users * (targetPercentage - e);
  var max = users * (targetPercentage + e);
  state.setup(app, users, edges);
  
  app.limitedInfection(targetUsers, '2.0');
  var betaUsers = app.model.Users.select({version: '2.0'});
              
  t.assert(betaUsers.length > min && betaUsers.length < max);
});


suite.teardown(function () {
  state.teardown(app);
});

suite.run();
