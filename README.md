HipChat2Email
=============

HipChat2Email is a HipChat Bot that allows forwarding HipChat messages as email.
This bot can be used to send messages as cards to Trello.
Note: The bot works in groups only.


Dependencies
------------

* nodejs >= 0.12
* npm
* redis-server
* public SSL secured domain (no self signed certificate, required for HipChat integration)


Install
-------

* cp config.json.default config.json
* # adapt config.json
* # provide your SSL certificate (see web.js)
  ssl/server.key
  ssl/server.crt
  ssl/domainvalidationsecureserverca.crt
  ssl/addtrustca.crt
  ssl/addtrustexternalcaroot.crt
* # modify package.json (baseUrls)
* ln -s /usr/bin/nodejs /usr/bin/node
* npm install -g nodemon
* npm install


Usage
-----

* Run using 'npm run web' or 'npm run web-dev'
* Install in HipChat using: https://[your-domain]:3000/addon/capabilities
* Type /help for usage instructions in a room where the bot has been added
