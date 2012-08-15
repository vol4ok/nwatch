# nWatch
Run script when a file changes on OS X

### Install
`npm install nwatcher -g`

### Run
`nwatch server` — starts server

`nwatch root .` — add watching directory (will watch all subdirs too)

`nwatch .` — add Watchfile directory that will execute when file changes on this directory or on it subdirectory

### Watchfile
Simple bash script, like this: 

```
cake build
```

### Usage
```
  nwatch server — starts server
  nwatch server stop — stop server
  nwatch server restart — restart server
  nwatch [DIR] — add watchfile directory
  nwatch (remove|rm) <DIR> — remove watchfile directory
  nwatch (list|ls) — list watch directories
  nwatch root [DIR] — add watch root
  nwatch root (remove|rm) <DIR> — remove watch root
  nwatch root (list|ls) — list all watch roots
```

### Licence
MIT LICENSE