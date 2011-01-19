var $C, Component;
var __slice = Array.prototype.slice;
Component = function() {};
Component.prototype = {
  extend: function() {
    var component, components, key, val, _i, _len, _results;
    components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    _results = [];
    for (_i = 0, _len = components.length; _i < _len; _i++) {
      component = components[_i];
      _results.push((function() {
        var _results;
        _results = [];
        for (key in component) {
          val = component[key];
          _results.push(this[key] = val);
        }
        return _results;
      }).call(this));
    }
    return _results;
  },
  "new": function() {
    var F, args, obj;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    F = function() {};
    F.prototype = this;
    obj = new F;
    if (obj.init != null) {
      obj.init.apply(obj, args);
    }
    return obj;
  }
};
$C = function() {
  var comp, components;
  components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  comp = new Component;
  comp.extend.apply(comp, components);
  return comp;
};