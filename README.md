---
---
# Habitat HD - Habitat services for Hardocs

Brief first entries to remind...

## Ubuntu installation

- create a DigitalOcean droplet of size [ *todo* - apropos]
- create a secure sudo user on the droplet

## oauth2-proxy setup
- create /opt/oauth2-proxy vi Go
- build the Go executable
- copy oauth2-proxy from it into this folder chmod 755

## install CouchDB and Node
- sudo apt install couchdb node

## install configuration files
- sftp the ubuntu folder to the user home
- copy the files according to their location into the droplet folders
- set appropriate ownership and permissions

## CouchDB admin setup
- replace admin in /opt/couchdb/local.ini with

## enable the systemd services
- n.b. couchdb has installed it's own service file in /lib/systemd/system, properly as vendor
- enable the systemd services by running  `sudo systemd daemon-reload`
- start the services via `sudo systemd start oauth2-proxy habitat-had couchdb`
- verify the services via `sudo systemd status oauth2-proxy habitat-had couchdb`
- stop the services, until later testing: `sudo systemctl stop oauth2-proxy habitat-had couchdb`
- verify the services are stopped now, via `sudo systemd status oauth2-proxy habitat-had couchdb`
- ensure the services don't autostart until all tests are done, via `sudo systemctl disable oauth2-proxy habitat-had couchdb`

## arrange for automatic service start on boot
- first, test everything. 
- See that services work
- see that unknown access fails for anything but database search
- see that appropriate authenticated users get the proper privileges and not others
- *only* when you are confident all operate securely, then `sudo systemctl enable oauth2-proxy habitat-had couchdb`

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
