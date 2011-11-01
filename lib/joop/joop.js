var joop;
var __slice = Array.prototype.slice;
module.exports = joop = function() {
  var func, funcs, i, t, _len;
  t = arguments[0], funcs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (typeof t === 'function') {
    funcs.unshift(t);
    t = 0;
  }
  for (i = 0, _len = funcs.length; i < _len; i++) {
    func = funcs[i];
    if (i !== funcs.length - 1) {
      funcs[i] = (function(func, i) {
        return function() {
          func();
          return process.nextTick(funcs[i + 1]);
        };
      })(func, i);
    }
  }
  return setInterval(funcs[0], t);
};