module.exports = joop = (t, funcs...)->
  if typeof t == 'function'
    funcs.unshift t
    t = 0
  for func, i in funcs
    unless i == funcs.length - 1
      funcs[i] = ((func,i)->
        return ->
          func()
          process.nextTick funcs[i + 1]
      )(func,i)
  setInterval funcs[0], t
