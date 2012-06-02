require 'colors'

$ = {}
$ extends require 'fs'
$ extends require 'util'

cmd = process.argv[2]
usage = -> console.log 'Usage: nwatch [add|rm|ls]'

if cmd
  hookio  = require('hook.io')
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