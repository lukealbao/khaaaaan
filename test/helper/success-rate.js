var sprintf = require('util').format;

function Suite (opts) {
  this.tests = [];
  this.inputs = [];
  this.expectations = [];
}

Suite.prototype.test = function (description, fn) {
  this.tests.push({
    description: description,
    fn: fn.bind(this)
  });
};

Suite.prototype.use = function (inputs, expectations) {
  if (!Array.isArray(expectations)) {
    for (var key in inputs) {
      this.inputs.push(key);
      this.expectations.push(inputs[key]);
    }
  } else {
    if (inputs.length !== expectations.length)
      throw new TypeError('Inputs length must match expecations length.');
    this.inputs = inputs;
    this.expectations = expectations;
  }
  return this.inputs.length;
};

Suite.prototype.runTest = function (test, reportErrors) {
  var desc = test.description;
  var fn = test.fn;
  var failCount = 0;

  var testStart = Date.now();
  
  for (var i = 0, l = this.inputs.length; i < l; i++) {
    try {
      fn({
        input: this.inputs[i],
        expected: this.expectations[i],
        compare: this.assert.equal(this.expectations[i]),
        assert: this.assert.assert
      });
    } catch (e) {
      if (reportErrors) console.log('\033[0;31m', e.stack, '\033[0;39m;');
      failCount += 1;
    }
    this.teardown();
  }

  var testEnd = Date.now() - testStart;
  var runningTime = testEnd / 1e3;

  return this.report(desc, this.inputs.length, failCount, runningTime);
};

Suite.prototype.teardown = function (fn) {
  this.teardown = fn.bind(this);
};

Suite.prototype.report = function (description, testCount, failCount, runningTime) {
  var successRate = Math.floor((1 - (failCount / testCount)) * 10000) / 100;
  console.log('  - Ran %d tests in %d seconds: Success rate of %d%',
              testCount, runningTime, successRate);
}

Suite.prototype.assert = {
  equal: function (expected) {
    return function assertEqual (actual) {
      if (actual !== expected) throw new Error('Expected ' + actual
                                              + ' to equal ' + expected);
    }
  },
  assert: function (bool) {
    if (!bool) throw new Error('Assertion failed');
  }
};
  
Suite.prototype.run = function (reportErrors) {
  var GREEN = '\033[4;36m';
  var CLEAR = '\033[0;39m';
  var self = this;
  this.tests.forEach(function (test) {
    console.log('\n  %s%s%s', GREEN, test.description, CLEAR);
    self.runTest(test, reportErrors);
  });
};

module.exports = Suite;
