require 'colors'
hookio  = require('hook.io')

$ = {}
$ extends require 'fs'

cmd = process.argv[2]

usage = -> console.log 'Usage: nwatch [add|remove|list]'

if cmd
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
      when 'remove'
        if process.argv < 4
          usage()
        else
          arg1 = $.realpathSync(process.argv[3])
          hook.emit('remove', arg1)
      when 'list'
        hook.emit('list')
    hook.stop -> process.exit(0)
  hook.connect()
else
  usage()