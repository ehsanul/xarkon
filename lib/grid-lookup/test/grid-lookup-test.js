var Grid, assert, indices1, indices2, vows;
var __indexOf = Array.prototype.indexOf || function(item) {
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] === item) return i;
  }
  return -1;
};
vows = require('vows');
Grid = require('../grid-lookup.js');
assert = require('assert');
indices1 = [0, 19, 19 * 20, 20 * 20 - 1];
indices2 = [6 + 8 * 20, 7 + 8 * 20, 8 + 8 * 20, 9 + 8 * 20, 10 + 8 * 20, 6 + 9 * 20, 7 + 9 * 20, 8 + 9 * 20, 9 + 9 * 20, 10 + 9 * 20, 6 + 10 * 20, 7 + 10 * 20, 8 + 10 * 20, 9 + 10 * 20, 10 + 10 * 20];
vows.describe('Grid').addBatch({
  'A grid': {
    topic: new Grid(1000, 1000, 20, 20),
    'inserts objects': function(grid) {
      var i, _i, _j, _len, _len2, _results;
      grid.insert('an id', 995, 995, 10, 10);
      grid.insert('another id', 345, 433, 192, 88);
      for (_i = 0, _len = indices1.length; _i < _len; _i++) {
        i = indices1[_i];
        assert.include(grid.grid[i], 'an id');
      }
      _results = [];
      for (_j = 0, _len2 = indices2.length; _j < _len2; _j++) {
        i = indices2[_j];
        _results.push(assert.include(grid.grid[i], 'another id'));
      }
      return _results;
    },
    'has no incorrect insertions': function(grid) {
      var i, _ref, _results;
      _results = [];
      for (i = 0, _ref = 20 * 20; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        if (__indexOf.call(indices1.concat(indices2), i) >= 0) {
          continue;
        }
        _results.push(assert.isEmpty(grid.grid[i]));
      }
      return _results;
    },
    'finds objects by range': function(grid) {
      var found;
      found = grid.rangeSearch(49, 49, 251, 351);
      assert.include(found, 'an id');
      return assert.include(found, 'another id');
    },
    'give no false positives for range search': function(grid) {
      var found1;
      found1 = grid.rangeSearch(50, 50, 1000, 349);
      return assert.isEmpty(found1);
    },
    'deletes objects': function(grid) {
      var i, _i, _len, _ref, _results;
      grid["delete"]('an id', 995, 995, 10, 10);
      grid["delete"]('another id', 345, 433, 192, 88);
      _ref = indices1.concat(indices2);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(assert.isUndefined(grid.grid[i].pop()));
      }
      return _results;
    }
  }
})["export"](module);