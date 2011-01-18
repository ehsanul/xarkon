#TODO:
# - component-based entity system - sweet, done!

Component = ->
Component.prototype =
  extend: (components...) ->
    for component in components
      for key, val of component
        this[key] = val
  new: ->
    obj = ->
    obj.prototype = this
    return new obj()

$C = (components...) ->
  comp = new Component()
  comp.extend(components...)
  return comp
