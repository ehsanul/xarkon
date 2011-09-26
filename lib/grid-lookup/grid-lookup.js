var Grid;
Grid = function(width, height, cols, rows) {
  var n, size;
  this.width = width;
  this.height = height;
  this.cols = cols;
  this.rows = rows;
  this.cw = width / cols;
  this.ch = height / rows;
  size = rows * cols;
  this.grid = new Array(size);
  for (n = 0; 0 <= size ? n < size : n > size; 0 <= size ? n++ : n--) {
    this.grid[n] = [];
  }
  return null;
};
Grid.prototype = {
  getCornerIndices: function(x, y, w, h) {
    var col1, col2, row1, row2;
    col1 = Math.floor(x / this.cw);
    row1 = Math.floor(y / this.ch);
    col2 = Math.floor((x + w) / this.cw);
    row2 = Math.floor((y + h) / this.ch);
    return [col1, row1, col2, row2];
  },
  wrappedIndices: function(c, r) {
    var col, row, wrap;
    wrap = function(n, max) {
      if (n >= max) {
        return n - max;
      } else if (n < 0) {
        return n + max;
      } else {
        return n;
      }
    };
    col = wrap(c, this.cols);
    row = wrap(r, this.rows);
    return [col, row];
  },
  insert: function(objId, x, y, w, h) {
    var c, col, col1, col2, r, row, row1, row2, _ref, _ref2;
    _ref = this.getCornerIndices(x, y, w, h), col1 = _ref[0], row1 = _ref[1], col2 = _ref[2], row2 = _ref[3];
    for (c = col1; col1 <= col2 ? c <= col2 : c >= col2; col1 <= col2 ? c++ : c--) {
      for (r = row1; row1 <= row2 ? r <= row2 : r >= row2; row1 <= row2 ? r++ : r--) {
        _ref2 = this.wrappedIndices(c, r), col = _ref2[0], row = _ref2[1];
        this.grid[row * this.cols + col].push(objId);
      }
    }
    return null;
  },
  insertCR: function(objId, col1, row1, col2, row2) {
    var c, col, r, row, _ref;
    for (c = col1; col1 <= col2 ? c <= col2 : c >= col2; col1 <= col2 ? c++ : c--) {
      for (r = row1; row1 <= row2 ? r <= row2 : r >= row2; row1 <= row2 ? r++ : r--) {
        _ref = this.wrappedIndices(c, r), col = _ref[0], row = _ref[1];
        this.grid[row * this.cols + col].push(objId);
      }
    }
    return null;
  },
  rangeSearch: function(x, y, w, h) {
    var c, col, col1, col2, f, found, objId, r, row, row1, row2, _i, _len, _ref, _ref2, _ref3, _results;
    _ref = this.getCornerIndices(x, y, w, h), col1 = _ref[0], row1 = _ref[1], col2 = _ref[2], row2 = _ref[3];
    found = {};
    for (c = col1; col1 <= col2 ? c <= col2 : c >= col2; col1 <= col2 ? c++ : c--) {
      for (r = row1; row1 <= row2 ? r <= row2 : r >= row2; row1 <= row2 ? r++ : r--) {
        _ref2 = this.wrappedIndices(c, r), col = _ref2[0], row = _ref2[1];
        _ref3 = this.grid[row * this.cols + col];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          objId = _ref3[_i];
          if (objId) {
            found[objId] = true;
          }
        }
      }
    }
    _results = [];
    for (f in found) {
      _results.push(f);
    }
    return _results;
  },
  "delete": function(objId, x, y, w, h) {
    var c, cell, col, col1, col2, i, id, r, row, row1, row2, _len, _ref, _ref2, _ref3;
    _ref = this.getCornerIndices(x, y, w, h), col1 = _ref[0], row1 = _ref[1], col2 = _ref[2], row2 = _ref[3];
    for (c = col1; col1 <= col2 ? c <= col2 : c >= col2; col1 <= col2 ? c++ : c--) {
      for (r = row1; row1 <= row2 ? r <= row2 : r >= row2; row1 <= row2 ? r++ : r--) {
        _ref2 = this.wrappedIndices(c, r), col = _ref2[0], row = _ref2[1];
        _ref3 = cell = this.grid[row * this.cols + col];
        for (i = 0, _len = _ref3.length; i < _len; i++) {
          id = _ref3[i];
          if (id === objId) {
            cell.splice(i, 1);
          }
        }
      }
    }
    return null;
  },
  deleteCR: function(objId, col1, row1, col2, row2) {
    var c, cell, col, i, id, r, row, _len, _ref, _ref2;
    for (c = col1; col1 <= col2 ? c <= col2 : c >= col2; col1 <= col2 ? c++ : c--) {
      for (r = row1; row1 <= row2 ? r <= row2 : r >= row2; row1 <= row2 ? r++ : r--) {
        _ref = this.wrappedIndices(c, r), col = _ref[0], row = _ref[1];
        _ref2 = cell = this.grid[row * this.cols + col];
        for (i = 0, _len = _ref2.length; i < _len; i++) {
          id = _ref2[i];
          if (id === objId) {
            cell.splice(i, 1);
          }
        }
      }
    }
    return null;
  },
  insertByIndices: function(objId, indices) {
    var i, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = indices.length; _i < _len; _i++) {
      i = indices[_i];
      _results.push(this.grid[i].push(objId));
    }
    return _results;
  },
  move: function(objId, x1, y1, x2, y2, w, h) {
    var i11, i12, i21, i22, j11, j12, j21, j22, _ref, _ref2;
    _ref = this.getCornerIndices(x1, y1, w, h), i11 = _ref[0], j11 = _ref[1], i12 = _ref[2], j12 = _ref[3];
    _ref2 = this.getCornerIndices(x2, y2, w, h), i21 = _ref2[0], j21 = _ref2[1], i22 = _ref2[2], j22 = _ref2[3];
    if (i11 === i21 && i12 === i22 && j11 === j21 && j12 === j22) {
      return null;
    } else {
      this["delete"](objId, x1, y1, w, h);
      this.insert(objId, x2, y2, w, h);
      return null;
    }
    /*
        if i21 <= i12 and i22 >= i11 and j21 <= j12 and j22 >= j11
          # overlapping areas! so don't just delete and reinsert everything..
    
          if i11 == i21 and i12 == i22
            if j11 == j21 and j12 == j22
              return null # nothing to change
            if j21 > j11
              @deleteCR(objId, i11, j11, i12, j21-1)
            else if j21 < j11
              @insertCR(objId, i21, j21, i22, j11-1)
    
            if j22 > j12
              @insertCR(objId, i21, j21+1, i22, j22)
            else if j22 < j12
              @deleteCR(objId, i11, j22+1, i12, j21)
    
            return null
          
          if i21 > i11
            @deleteCR(objId, i11, j11, i21-1, j12)
            if j21 > j11
              @deleteCR(objId, i21, j11, i12, j21-1)
            else if j21 < j11
              @insertCR(objId, i21, j21, i22, j11-1)
    
            if j22 > j12
              @insertCR(objId, i21, j21+1, i22, j22)
            else if j22 < j12
              @deleteCR(objId, i21, j22+1, i12, j21)
    
          else if i21 < i11
            @insertCR(objId, i21, j21, i11-1, j22)
            if j21 > j11
              @deleteCR(objId, i11, j11, i12, j21-1)
            else if j21 < j11
              @insertCR(objId, i21, j21, i22, j11-1)
    
            if j22 > j12
              @insertCR(objId, i21, j21+1, i22, j22)
            else if j22 < j12
              @deleteCR(objId, i11, j22+1, i12, j21)
          
          if i22 > i12
            @insertCR(objId, i12+1, j21, i22, j22) # problems if i21 > i12+1
            if j21 > j11
              @deleteCR(objId, i11, j11, i12, j21-1)
            else if j21 < j11
              @insertCR(objId, i21, j21, i22, j11-1)
    
            if j22 > j12
              @insertCR(objId, i21, j21+1, i22, j22)
            else if j22 < j12
              @deleteCR(objId, i11, j22+1, i12, j21)
    
          else if i22 < i12
            @deleteCR(objId, i22+1, j11, i12, j12)
            if j21 > j11
              @deleteCR(objId, i11, j11, i22, j21-1)
            else if j21 < j11
              @insertCR(objId, i21, j21, i22, j11-1)
    
            if j22 > j12
              @insertCR(objId, i21, j21+1, i22, j22)
            else if j22 < j12
              @deleteCR(objId, i11, j22+1, i22, j21)
        else
          @delete objId, x1, y1, w, h
          @insert objId, x2, y2, w, h
    
    
        return null
        */
  }
};
if (typeof module !== "undefined" && module !== null) {
  module.exports = Grid;
}