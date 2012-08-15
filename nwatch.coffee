###!
 * Copyright (c) 2012 Andrew Volkov <hello@vol4ok.net>
###

require 'colors'

forever  = require("forever")
exec     = require('child_process').exec

$ = require 'core.js'
$ extends require 'fs'
$ extends require 'path'
 
class Watcher
  constructor: (options) ->
    {@root, @onChange, @onError} = options
    @watcher = forever.start ["ruby", "#{__dirname}/fswatch.rb", @root],
      max:    10
      silent: yes
    @watcher.on "stdout", @on_stdout
    @watcher.on "stderr", @on_stderr

  release: ->
    @watcher.stop()

  on_stdout: (data) =>
      data = data.toString().trim()
      try
        paths = JSON.parse("[" + data.replace(/\]\[/g, ",").replace(/[\[\]]/g, "") + "]")
        for path in paths
          path = $.realpathSync(path.toString())
          while path != '/'
            @onChange(path, @root)
            break if path is @root
            path = $.dirname(path)
      catch error
        @onError(error)

  on_stderr: (error) ->
    @onError(error)



class Server
  constructor: ->
    @start()
    @verbose = yes

  start: ->
    @roots = {}
    @dirs = {}
    @server = require('hook.io').createHook 
      name: 'server'
      silent: yes
    @server.on '*::root::add', @on_rootAdd
    @server.on '*::root::rm', @on_rootRm
    @server.on '*::root::ls', @on_rootLs
    @server.on '*::dir::add', @on_dirAdd
    @server.on '*::dir::rm', @on_dirRm
    @server.on '*::dir::ls', @on_dirLs
    @server.on '*::srv::stop', @on_srvStop
    @server.on '*::srv::restart', @on_srvRestart
    @server.start()
    console.log @_time(), 'server started'.green

  release: ->
    console.log @_time(), 'stop server'.red
    @server.stop()
    @server = undefined
    for k,v of @roots
      @removeWatcher(v.watcher)
      delete @roots[k]
    delete @dirs
    delete @roots

  createWatcher: (root) ->
    return new Watcher
      root: root
      onChange: @on_dirChange
      onError: @on_dirError

  removeWatcher: (watcher) ->
    watcher.release()

  _count: (obj) ->
    i = 0
    i++ for k of obj
    return ''+i

  _time: -> 
    now = new Date
    r = "["
    r += ('0'  + now.getHours()).slice(-2) + ":"
    r += ('0'  + now.getMinutes()).slice(-2) + ":"
    r += ('0'  + now.getSeconds()).slice(-2) + "."
    r += ('00' + now.getMilliseconds()).slice(-3)
    r += "]"
    return r.magenta

  on_rootAdd: (root, callback) =>
    oldRoot = false
    for k of @roots
      return callback(1, 'This directory already in root'.yellow) if root == k or $.startsWith(root, k)
      if $.startsWith(k, root)
        @removeWatcher(@roots[k].watcher)
        delete @roots[k]
        oldRoot = k
    watcher = @createWatcher(root)
    @roots[root] = 
      root: root
      watcher: watcher
    if oldRoot
      console.log @_time(), 'update root'.cyan, oldRoot.grey, '->'.cyan, root.grey
      callback(null, "Watch root ".cyan + oldRoot.grey + " -> ".cyan + 
        root.grey + " updated!\nWatch root count: ".cyan + @_count(@roots).magenta)
    else
      console.log @_time(), 'add root'.green, root.grey
      callback(null, "Watch root ".green + root.grey + 
        " successfully added!\nWatch root count: ".green + @_count(@roots).magenta)

  on_rootRm: (root, callback) =>
    console.log "=> on_rootRm".cyan
    return callback(2, 'Watch root not found') unless @roots[root]
    @removeWatcher(@roots[root].watcher)
    delete @roots[root]
    callback(null, "Watch root successfully removed!")

  on_rootLs: (arg, callback) =>
    list = []
    list.push(k) for k of @roots
    callback(null, list)

  on_dirChange: (path, root) =>
    return unless @dirs[path]
    console.log @_time(), "exec".green, $.join($.relative(root, path), 'Watchfile').grey
    exec "$SHELL ./Watchfile", cwd: path, @on_execComplete

  on_execComplete: (err, stdout, stderr) =>
    if err
      console.error stderr.trim().red
    else
      console.log stdout.trim() if @verbose

  on_dirError: (err) ->
    console.error err.red

  on_dirAdd: (dir, callback) =>
    return callback(1, 'This directory already exists'.yellow) if @dirs[dir]?
    @dirs[dir] = dir
    console.log @_time(), 'add dir'.green, dir.grey
    callback(null, "Watchfile dir ".green + dir.grey + 
        " successfully added!\nWatchfile dir count: ".green + @_count(@dirs).magenta)

  on_dirRm: (dir, callback) =>
    return callback(2, "Directory ".red + dir.grey + " not found".red) unless @dirs[dir]
    @delete @dirs[dir]
    callback(null, "Directory ".magenta + dir.grey + " removed from watch!".magenta)

  on_dirLs: (arg, callback) =>
    list = []
    list.push(k) for k of @dirs
    callback(null, list)

  on_srvStop: =>
    @release()
    process.exit(0)

  on_srvRestart: =>
    @release()
    @start()



class Client
  uid: 0
  constructor: ->
    @client = require('hook.io').createHook name: "client-#{@uid++}", silent: yes
    @client.on 'hook::ready', @on_ready
    @client.start()
  release: (err = 0) ->
    @client.stop()
    process.exit(err)
  on_ready: =>
  on_complete: (err, msg) =>
    if err is 1
      console.warn msg
    else if err is 2
      console.error msg
    else 
      console.log msg
    @release()

class AddDirCmd extends Client
  constructor: (@dir) -> super()
  on_ready: => @client.emit('dir::add', @dir, @on_complete)

class RemoveDirCmd extends Client
  constructor: (@dir) -> super()
  on_ready: => @client.emit('dir::rm', @dir, @on_complete)

class ListDirsCmd extends Client
  constructor: -> super()
  on_ready: => @client.emit('dir::ls', null, @on_complete)
  on_complete: (err, dirs) =>
    if dirs.length > 0
      console.log 'Watchfile dirs:'.green
      for dir,i in dirs
        console.log "#{i+1}. ".cyan, dir.magenta
    else 
      console.log 'No watchfile dirs'.yellow
    @release()
    

class AddRootCmd extends Client
  constructor: (@dir) -> super()
  on_ready: => @client.emit('root::add', @dir, @on_complete)

class RemoveRootCmd extends Client
  constructor: (@dir) -> super()
  on_ready: => @client.emit('root::rm', @dir, @on_complete)

class ListRootsCmd extends Client
  constructor: -> super()
  on_ready: => @client.emit('root::ls', null, @on_complete)
  on_complete: (err, dirs) =>
    if dirs.length > 0
      console.log 'Root dirs:'.green
      for dir,i in dirs
        console.log "#{i+1}.".cyan, dir.magenta
    else 
      console.log 'No root dirs'.yellow
    @release()

class StopServerCmd extends Client
  constructor: -> super()
  on_ready: => 
    @client.emit('srv::stop')
    @release()

class RestartServerCmd extends Client
  constructor: -> super()
  on_ready: => 
    @client.emit('srv::restart')
    @release()

usage = ->
  console.log "Usage:"
  console.log "  nwatch ".cyan+"server".green+" — starts server"
  console.log "  nwatch ".cyan+"server stop".green+" — stop server"
  console.log "  nwatch ".cyan+"server restart".green+" — restart server"
  console.log "  nwatch ".cyan+"[DIR]".grey+" — add watchfile directory"
  console.log "  nwatch ".cyan+"(remove|rm)".green+" <DIR>".magenta+" — remove watchfile directory"
  console.log "  nwatch ".cyan+"(list|ls)".green+" — list watch directories"
  console.log "  nwatch ".cyan+"root".green+" [DIR]".grey+" — add watch root"
  console.log "  nwatch ".cyan+"root (remove|rm)".green+" <DIR>".magenta+" — remove watch root"
  console.log "  nwatch ".cyan+"root (list|ls)".green+" — list all watch roots"

safePath = (path) ->
  try
    return $.realpathSync(path ? '.')
  catch e
    if $.isString(path)
      console.error 'Invalid path!'.red
      console.log 'Type `nwatch ?` for help.'.grey
    process.exit(1)

argv = process.argv.slice(2)

switch argv[0]
  when 'root'
    switch argv[1]
      when 'add', 'a', '+' then new AddRootCmd(safePath(argv[2]))
      when 'remove', 'rm', 'r', '-' then new RemoveRootCmd(safePath(argv[2]))
      when 'list', 'ls', 'l' then new ListRootsCmd()
      else new AddRootCmd(safePath(argv[1]))
  when 'server'
    switch argv[1]
      when 'start' then new Server()
      when 'restart' then new RestartServerCmd()
      when 'stop' then new StopServerCmd()
      else new Server()
  when 'watch'
    switch argv[1]
      when 'add', 'a', '+' then new AddDirCmd(safePath(argv[2]))
      when 'remove', 'rm', 'r', '-' then new RemoveDirCmd(safePath(argv[2]))
      when 'list', 'ls', 'l' then new ListDirsCmd()
      else new AddRootCmd(safePath(argv[1]))
  when 'stop' then new StopServerCmd()
  when 'restart' then new RestartServerCmd()
  when 'add', 'a', '+' then new AddDirCmd(safePath(argv[1]))
  when 'remove', 'rm', 'r', '-' then new RemoveDirCmd(safePath(argv[1]))
  when 'list', 'ls', 'l' then new ListDirsCmd()
  when 'h', '-h', 'help', '--help' then usage()
  else new AddDirCmd(safePath(argv[0]))