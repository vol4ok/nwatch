require 'colors'
hookio  = require('hook.io')
optimist = require('optimist')

hook = hookio.createHook name: 'client', silent: yes

hook.on 'hook::ready', ->
  hook.emit('add', {'/Volumes/RAM/fsev': '/Volumes/RAM/fsev/example.coffee'})
  hook.emit('remove', 'data')
  hook.emit('list', 'data')
  hook.stop -> process.exit(0)

hook.connect()