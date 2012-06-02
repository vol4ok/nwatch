require 'colors'

$ = {}
$ extends require 'path'
$ extends require 'fs'
$ extends require 'util'

forever = require("forever")
hookio  = require('hook.io')
hook = hookio.createHook name: 'server', silent: yes

ROOT = '/Volumes/RAM'
dirs = {}

#dirs[$.realpathSync(__dirname)] = $.join(__dirname, 'example.coffee')
#console.log dirs 

child = forever.start ["ruby", "#{__dirname}/fswatch.rb", ROOT],
  max:    10
  silent: true

child.on "stdout", (data) =>
  data = data.toString().trim()
  try
    path = JSON.parse("[" + data.replace(/\]\[/g, ",").replace(/[\[\]]/g, "") + "]")
    path = $.realpathSync(path.toString())
    console.log path.green
    require(dirs[path])() if dirs[path]
  catch error
    console.error error.toString().red

child.on "stderr", (data) ->
  console.error data.toString()
  
hook.on '*::add', (data) ->
  console.log "#{@event} -> #{data}".cyan
  dirs extends data
  console.log data
  
hook.on '*::rm', (data) ->
  console.log "#{@event} -> #{data}".cyan
  delete dirs[data]
  console.log dirs
  
hook.on '*::ls', ->
  console.log "#{@event}".cyan
  console.log $.inspect(dirs, false, null, true)
  hook.emit('ls-result', dirs)
  return dirs
  
forever.startServer(child)
hook.start()