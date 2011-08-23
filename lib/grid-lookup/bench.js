var Grid, a, grid, h, i, n, objs, r1, r2, r3, r4, rr1, rr2, t, w, x, y, _ref, _ref2;
Grid = require('./grid-lookup.js');
w = 60;
h = 60;
objs = [];
for (x = 0; 0 <= w ? x < w : x > w; 0 <= w ? x++ : x--) {
  for (y = 0; 0 <= h ? y < h : y > h; 0 <= h ? y++ : y--) {
    r1 = 200 * w * Math.random();
    r2 = 200 * h * Math.random();
    r3 = 40 + 160 * Math.random();
    r4 = 40 + 160 * Math.random();
    i = y * w + x;
    objs[i] = [r1, r2, r3, r4];
  }
}
for (n = 1; n <= 100; n++) {
  grid = new Grid(20000, 20000, n, n);
  for (x = 0; 0 <= w ? x < w : x > w; 0 <= w ? x++ : x--) {
    for (y = 0; 0 <= h ? y < h : y > h; 0 <= h ? y++ : y--) {
      i = y * w + x;
      _ref = objs[i], r1 = _ref[0], r2 = _ref[1], r3 = _ref[2], r4 = _ref[3];
      grid.insert(i, r1, r2, r3, r4);
    }
  }
  t = (new Date).getTime();
  for (a = 1; a <= 50; a++) {
    for (x = 0; 0 <= w ? x < w : x > w; 0 <= w ? x++ : x--) {
      for (y = 0; 0 <= h ? y < h : y > h; 0 <= h ? y++ : y--) {
        i = y * w + x;
        _ref2 = objs[i], r1 = _ref2[0], r2 = _ref2[1], r3 = _ref2[2], r4 = _ref2[3];
        rr1 = 50 * Math.random();
        rr2 = 50 * Math.random();
        grid.move(i, r1, r2, r1 + rr1, r2 + rr2, r3, r4);
        grid.move(i, r1 + rr1, r2 + rr2, r1, r2, r3, r4);
      }
    }
  }
  console.log("" + n + "," + ((new Date).getTime() - t));
}