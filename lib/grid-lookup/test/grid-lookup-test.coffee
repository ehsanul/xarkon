#TODO test move
vows = require 'vows'
Grid = require '../grid-lookup.js'
assert = require('assert')

indices1 = [0, 19, 19*20, 20*20-1]
indices2 = [
  6+8*20, 7+8*20, 8+8*20, 9+8*20, 10+8*20
  6+9*20, 7+9*20, 8+9*20, 9+9*20, 10+9*20
  6+10*20, 7+10*20, 8+10*20, 9+10*20, 10+10*20
]

vows.describe('Grid').addBatch(
  'A grid':
    topic: new Grid 1000, 1000, 20, 20
    'inserts objects': (grid)->
      grid.insert 'an id', 995, 995, 10, 10
      grid.insert 'another id', 345, 433, 192, 88
      for i in indices1
        assert.include grid.grid[i], 'an id'
      for i in indices2
        assert.include grid.grid[i], 'another id'
    'has no incorrect insertions': (grid)->
      for i in [0...(20*20)]
        continue if i in indices1.concat(indices2)
        assert.isEmpty grid.grid[i]
    'finds objects by range': (grid)->
      found = grid.rangeSearch 49, 49, 251, 351
      assert.include found, 'an id'
      assert.include found, 'another id'
    'give no false positives for range search': (grid)->
      found1 = grid.rangeSearch 50, 50, 1000, 349
      assert.isEmpty found1
    'deletes objects': (grid)->
      grid.delete 'an id', 995, 995, 10, 10
      grid.delete 'another id', 345, 433, 192, 88
      for i in indices1.concat(indices2)
        assert.isUndefined grid.grid[i].pop()
).export(module)
