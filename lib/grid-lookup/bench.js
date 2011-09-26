var Grid, a, grid, h, i, n, numObjects, objs, r1, r2, r3, r4, rr1, rr2, t, w, _ref, _ref2;
Grid = require('./grid-lookup.js');
w = 10000;
h = 10000;
numObjects = 4500;
objs = [];
for (i = 0; 0 <= numObjects ? i < numObjects : i > numObjects; 0 <= numObjects ? i++ : i--) {
  r1 = w * Math.random();
  r2 = h * Math.random();
  r3 = 40 + 160 * Math.random();
  r4 = 40 + 160 * Math.random();
  objs[i] = [r1, r2, r3, r4];
}
/*
for x in [0...w]
  for y in [0...h]
    r1 = 200*w*Math.random()
    r2 = 200*h*Math.random()
    r3 = 40 + 160*Math.random()
    r4 = 40 + 160*Math.random()
    i = y*w + x
    objs[i] = [r1, r2, r3, r4]
*/
for (n = 1; n <= 100; n++) {
  grid = new Grid(10000, 10000, n, n);
  for (i = 0; 0 <= numObjects ? i < numObjects : i > numObjects; 0 <= numObjects ? i++ : i--) {
    _ref = objs[i], r1 = _ref[0], r2 = _ref[1], r3 = _ref[2], r4 = _ref[3];
    grid.insert(i, r1, r2, r3, r4);
  }
  t = (new Date).getTime();
  for (a = 1; a <= 30; a++) {
    for (i = 0; 0 <= numObjects ? i < numObjects : i > numObjects; 0 <= numObjects ? i++ : i--) {
      _ref2 = objs[i], r1 = _ref2[0], r2 = _ref2[1], r3 = _ref2[2], r4 = _ref2[3];
      rr1 = 50 - 100 * Math.random();
      rr2 = 50 - 100 * Math.random();
      grid.move(i, r1, r2, r1 + rr1, r2 + rr2, r3, r4);
    }
  }
  console.log("" + n + "," + ((new Date).getTime() - t));
}