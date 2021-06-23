#!/bin/bash

read -p "Digite a url de acesso: " SITE


sudo apt-get -y update
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
sudo apt-get -y update && sudo apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_12.x | sudo bash -
sudo apt-get install -y build-essential mongodb-org nodejs graphicsmagick nginx git certbot python3-certbot-nginx 
sudo apt-get install -y npm
sudo npm install -g inherits n && sudo n 12.18.4
curl -L https://releases.rocket.chat/latest/download -o /tmp/rocket.chat.tgz
tar -xzf /tmp/rocket.chat.tgz -C /tmp
cd /tmp/bundle/programs/server && npm install
sudo mv /tmp/bundle /opt/Rocket.Chat
sudo useradd -M rocketchat && sudo usermod -L rocketchat
sudo chown -R rocketchat:rocketchat /opt/Rocket.Chat

cat << EOF |sudo tee -a /lib/systemd/system/rocketchat.service
[Unit]
Description=The Rocket.Chat server
After=network.target remote-fs.target nss-lookup.target nginx.service mongod.service
[Service]
ExecStart=/usr/local/bin/node /opt/Rocket.Chat/main.js
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=rocketchat
User=rocketchat
Environment=MONGO_URL=mongodb://localhost:27017/rocketchat?replicaSet=rs01 MONGO_OPLOG_URL=mongodb://localhost:27017/local?replicaSet=rs01 ROOT_URL=https://$SITE/ PORT=3002
[Install]
WantedBy=multi-user.target
EOF

echo "server {
        root /var/www/html;
        index index.html index.htm index.nginx-debian.html;
        server_name $SITE;

        location / {
        proxy_pass http://$SITE:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forward-Proto http;
        proxy_set_header X-Nginx-Proxy true;
        proxy_redirect off;
    }
}
server {
        root /var/www/html;
        index index.html index.htm index.nginx-debian.html;
        server_name $SITE;

        location / {
        proxy_pass http://back$SITE:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forward-Proto http;
        proxy_set_header X-Nginx-Proxy true;
        proxy_redirect off;
    }
}    " >> /etc/nginx/sites-available/default

sudo sed -i "s/^#  engine:/  engine: mmapv1/"  /etc/mongod.conf

sudo sed -i "s/^#replication:/replication:\n  replSetName: rs01/" /etc/mongod.conf

sudo systemctl enable mongod && sudo systemctl start mongod

mongo --eval "printjson(rs.initiate())" #Esse comando precisa ser executado manualmente após a execução do script.

sudo systemctl enable rocketchat && sudo systemctl start rocketchat

touch /etc/init.d/backuprocket.sh

echo "
#!/bin/bash
#Referencia https://github.com/RocketChat/Rocket.Chat/issues/4297
DATA=$(date +%d%m%Y)
systemctl stop rocketchat.service
mongodump -o /tmp/backup
tar -cvf /tmp/backup\$DATA.tar /tmp/backup
systemctl start rocketchat.service
scp -P8022 /tmp/backup\$DATA.tar user@host.rync:/diretorioremoto
rm -rf /tmp/backup
rm -rf /tmp/backup\$DATA.tar" >> /etc/init.d/backuprocket.sh
chmod +x /etc/init.d/backuprocket.sh

#Restore
#tar xvf backup.tar
#mongorestore ~/backup