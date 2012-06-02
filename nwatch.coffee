require 'colors'

$ = {}
$ extends require 'path'
$ extends require 'fs'
$ extends require 'util'

hookio  = require('hook.io')

usage = -> console.log 'Usage: nwatch [add|rm|ls|server]'

server = (root) ->
  forever = require("forever")
  hook = hookio.createHook name: 'server', silent: yes
  root = $.realpathSync(root)
  dirs = {}

  child = forever.start ["ruby", "#{__dirname}/fswatch.rb", root],
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
    console.log "#{@event} (#{$.inspect(data, false, null, true)})".cyan
    dirs extends data
    hook.emit('print', dirs)
  
  hook.on '*::rm', (data) ->
    console.log "#{@event} (#{data.green})".cyan
    delete dirs[data]
    hook.emit('print', dirs)
  
  hook.on '*::ls', ->
    console.log "#{@event}".cyan
    hook.emit('print', dirs)
  
  forever.startServer(child)
  hook.start()


cmd = process.argv[2]

if cmd is 'server'
  if process.argv < 4
    usage()
  else
    server(process.argv[3])
else if cmd
  hook = hookio.createHook name: 'client', silent: yes
  
  hook.on 'hook::ready', ->
    switch cmd
      when 'add'
        if process.argv < 5
          usage()
        else
          arg1 = $.realpathSync(process.argv[3])
          arg2 = $.realpathSync(process.argv[4])
          obj = {}
          obj[arg1] = arg2
          hook.emit('add', obj)
      when 'rm'
        if process.argv < 4
          usage()
        else
          arg1 = $.realpathSync(process.argv[3])
          hook.emit('rm', arg1)
      when 'ls'
        hook.emit('ls')
      else
        usage()
        process.exit(0)
        
  hook.on '*::print', (data) ->
    console.log '\nWatch list:'.cyan
    for k,v of data
      continue if k is 'prototype'
      console.log " * #{k.green}: #{v.magenta}"
    console.log ""
    hook.stop -> process.exit(0)
    
  hook.start()
else
  usage()