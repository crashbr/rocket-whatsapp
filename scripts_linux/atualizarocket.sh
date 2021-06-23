#!/bin/bash
systemctl stop rocketchat
rm -rf /opt/Rocket.Chat
curl -L https://releases.rocket.chat/latest/download -o /tmp/rocket.chat.tgz
tar -xzf /tmp/rocket.chat.tgz -C /tmp
cd /tmp/bundle/programs/server && npm install
mv /tmp/bundle /opt/Rocket.Chat
chown -R rocketchat:rocketchat /opt/Rocket.Chat
systemctl start rocketchat
