---
---
# Habitat HD - Habitat services for Hardocs

# Status

This is a record of the fully operating Habitat installation on the present discovery and development server, as of 29 November 2020.

The installation is fully functional to its stage of implementation of the current design, and demonstrates primary Hardocs cloud operations, always with full security and with a good degree of administrative control present, matched to its abilities.

There are a few further control and abilities features yet to be implemented, in the appropriate server functions and in their Habitat client-side api, according to current design. These will become present before long.

The notes below are not exactly installation instructions, and are not complete, if they outline enough for experienced developmental rebuilding of a discovery and proof server. This document will be improved along with the filling out of current design functions.

## Ubuntu installation

Brief first entries to remind...

- create a DigitalOcean droplet of size [ *todo* - apropos]
- create a secure sudo user on the droplet

## oauth2-proxy setup
- create /opt/oauth2-proxy vi Go
- build the Go executable
- copy oauth2-proxy from it into this folder chmod 755
- sftp ubuntu to home dir (*todo* unify/reorder so this is first)
- cp oauth2-proxy.service to /etc/systemd/system
- sudo systemctl daemon-reload to use the service

## install CouchDB and Node
- sudo apt install couchdb node

## install configuration files
- sftp the ubuntu folder to the user home
- copy the files according to their location into the droplet folders
- set appropriate ownership and permissions

## CouchDB admin setup
- replace admin in /opt/couchdb/local.ini with
  *todo* explain about this
- sudo systemctl daemon-reload to use the service

## habitat-hd setup
- make a login for the this service
- mkdir habitat-hd in the home directory
- sftp up src scripts types package.json from here
- cd ~/habitat-hd
- npm install
- npm run build
- you have already ~/ubuntu/etc/systemd/system; sudo cp habitat-hd.service /etc/systemd/system
- sudo systemctl daemon-reload to use the service

## enable the systemd services
- n.b. couchdb has installed it's own service file in /lib/systemd/system, properly as vendor
- enable the systemd services by running  `sudo systemd daemon-reload`
- start the services via `sudo systemd start oauth2-proxy habitat-hd couchdb`
- verify the services via `sudo systemd status oauth2-proxy habitat-hd couchdb`
- stop the services, until later testing: `sudo systemctl stop oauth2-proxy habitat-hd couchdb`
- verify the services are stopped now, via `sudo systemd status oauth2-proxy habitat-hd couchdb`
- ensure the services don't autostart until all tests are done, via `sudo systemctl disable oauth2-proxy habitat-hd couchdb`

## arrange for automatic service start on boot
- first, test everything.
- See that services work
- see that unknown access fails for anything but database search
- see that appropriate authenticated users get the proper privileges and not others
- *only* when you are confident all operate securely, then `sudo systemctl enable oauth2-proxy habitat-hd couchdb`

## Backups!
 - back up our work now
 - set up regular automated backups for all installed files, and the database in

Juat as in the ubuntu folder here

## Operations

### logging
actively monitor logs:
- sudo journalctl -u habitat-hd -f
- sudo journalctl -u oauth2-proxy -f
- sudo journalctl -u couchdb -f
