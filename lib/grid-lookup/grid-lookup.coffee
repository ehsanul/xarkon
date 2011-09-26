#TODO benchmark
Grid = (width, height, cols, rows)->
  @width = width
  @height = height
  @cols = cols
  @rows = rows
  @cw = width / cols # cell width
  @ch = height / rows # cell height
  size = rows * cols
  @grid = new Array(size)
  for n in [0...size]
    @grid[n] = []
  return null

Grid.prototype =
  getCornerIndices: (x, y, w, h)->
    col1 = Math.floor x/@cw
    row1 = Math.floor y/@ch
    col2 = Math.floor (x+w)/@cw
    row2 = Math.floor (y+h)/@ch
    return [col1, row1, col2, row2]
  
  wrappedIndices: (c, r)->
    wrap = (n, max)->
      if n >= max
        return n - max
      else if n < 0
        return n + max
      else
        return n
    col = wrap c, @cols
    row = wrap r, @rows
    return [col, row]

  insert: (objId, x, y, w, h)->
    [col1, row1, col2, row2] = @getCornerIndices x, y, w, h
    for c in [col1..col2]
      for r in [row1..row2]
        [col, row] = @wrappedIndices c, r
        @grid[ row*@cols + col ].push objId
    return null

  insertCR: (objId, col1, row1, col2, row2)->
    for c in [col1..col2]
      for r in [row1..row2]
        [col, row] = @wrappedIndices c, r
        @grid[ row*@cols + col ].push objId
    return null

  rangeSearch: (x, y, w, h)->
    [col1, row1, col2, row2] = @getCornerIndices x, y, w, h
    found = {}
    for c in [col1..col2]
      for r in [row1..row2]
        [col, row] = @wrappedIndices c, r
        for objId in @grid[ row*@cols + col ]
          found[objId] = true if objId
          #found.push objId unless objId in found # return only unique objIds
    return (f for f of found)

  delete: (objId, x, y, w, h)->
    [col1, row1, col2, row2] = @getCornerIndices x, y, w, h
    for c in [col1..col2]
      for r in [row1..row2]
        [col, row] = @wrappedIndices c, r
        for id,i in cell = @grid[ row*@cols + col ]
          #delete cell[i] if id == objId
          cell.splice(i,1) if id == objId
    return null
  
  deleteCR: (objId, col1, row1, col2, row2)->
    for c in [col1..col2]
      for r in [row1..row2]
        [col, row] = @wrappedIndices c, r
        for id,i in cell = @grid[ row*@cols + col ]
          #delete cell[i] if id == objId
          cell.splice(i,1) if id == objId
    return null

  insertByIndices: (objId, indices)->
    @grid[i].push objId for i in indices

  #TODO prematurely optimize
  move: (objId, x1, y1, x2, y2, w, h)->
    [i11, j11, i12, j12] = @getCornerIndices x1, y1, w, h
    [i21, j21, i22, j22] = @getCornerIndices x2, y2, w, h

    if i11 == i21 and
       i12 == i22 and
       j11 == j21 and
       j12 == j22
      return null # nothing to change
    else
      @delete objId, x1, y1, w, h
      @insert objId, x2, y2, w, h
      return null

    # the below code is a faster version of move (about 1.5x the speed)
    # but it's buggy: once in a while, randomly, the objId will disappear from
    # the grid instead of being deleted and re-inserted
    #TODO fix bug below
    ###
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
    ###

module?.exports = Grid
