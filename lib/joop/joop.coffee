module.exports = joop = (funcs..., t)->
  if typeof t == 'function'
    funcs.push(t)
    t = 0
  for func, i in funcs
    unless i == funcs.length-1
      funcs[i] = ((func,i)->
        return ->
          func()
          setTimeout(funcs[i+1], 0)
      )(func,i)
  return ->
    setTimeout(arguments.callee, t)
    funcs[0]()
