Grid = require('./grid-lookup.js')
w = 60
h = 60
objs = []
for x in [0...w]
  for y in [0...h]
    r1 = 200*w*Math.random()
    r2 = 200*h*Math.random()
    r3 = 40 + 160*Math.random()
    r4 = 40 + 160*Math.random()
    i = y*w + x
    objs[i] = [r1, r2, r3, r4]

for n in [1..100]
  grid = new Grid(20000,20000, n, n)
  for x in [0...w]
    for y in [0...h]
      i = y*w + x
      [r1, r2, r3, r4] = objs[i]
      grid.insert(i, r1, r2, r3, r4)

  t = (new Date).getTime()
  for a in [1..50]
    for x in [0...w]
      for y in [0...h]
        #grid.delete(x*y, 10*x, 10*y, 100, 100)
        #grid.insert(x*y, 9*x, 9*y, 100, 100)
        i = y*w + x
        [r1, r2, r3, r4] = objs[i]
        rr1 = 50*Math.random()
        rr2 = 50*Math.random()
        grid.move(i, r1, r2, r1+rr1, r2+rr2, r3, r4)
        grid.move(i, r1+rr1, r2+rr2, r1, r2, r3, r4)
  console.log "#{n},#{(new Date).getTime() - t}"
