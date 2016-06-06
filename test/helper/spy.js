'use strict';

function spyOn (obj, method) {
  var spy = {
    count: 0,
    reset: function () { this.count = 0 }
  };

  var stashed = obj[method];
  obj[method] = function inspectedFn () {
    spy.count += 1;
    var args = [].concat(arguments);
    return stashed.apply(obj, args);
  }
  
  return spy;
}

module.exports = spyOn;
