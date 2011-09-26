Grid = require('./grid-lookup.js')
w = 10000
h = 10000
numObjects = 4500
objs = []
for i in [0...numObjects]
  r1 = w*Math.random()
  r2 = h*Math.random()
  r3 = 40 + 160*Math.random()
  r4 = 40 + 160*Math.random()
  objs[i] = [r1, r2, r3, r4]
###
for x in [0...w]
  for y in [0...h]
    r1 = 200*w*Math.random()
    r2 = 200*h*Math.random()
    r3 = 40 + 160*Math.random()
    r4 = 40 + 160*Math.random()
    i = y*w + x
    objs[i] = [r1, r2, r3, r4]
###

for n in [1..100]
  grid = new Grid(10000,10000, n, n)
  for i in [0...numObjects]
    #for x in [0...w]
    #for y in [0...h]
    #  i = y*w + x
    [r1, r2, r3, r4] = objs[i]
    grid.insert(i, r1, r2, r3, r4)

  t = (new Date).getTime()
  for a in [1..30]
    for i in [0...numObjects]
      #for x in [0...w]
      #for y in [0...h]
      #  i = y*w + x
      [r1, r2, r3, r4] = objs[i]
      rr1 = 50 - 100*Math.random()
      rr2 = 50 - 100*Math.random()
      grid.move(i, r1, r2, r1+rr1, r2+rr2, r3, r4)
      #grid.move(i, r1+rr1, r2+rr2, r1, r2, r3, r4)
  console.log "#{n},#{(new Date).getTime() - t}"
