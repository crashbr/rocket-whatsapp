read -p "Digite a url de acesso: " SITE
#!/bin/bash
#https://rocket.chat/docs/installation/manual-installation/debian/
apt-get -y update
apt-get install -y dirmngr && apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list
apt-get -y update && apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_12.x | bash -
apt-get install -y build-essential mongodb-org nodejs graphicsmagick nginx certbot python-certbot-nginx
npm install -g inherits n && n 12.14.0
curl -L https://releases.rocket.chat/latest/download -o /tmp/rocket.chat.tgz
tar -xzf /tmp/rocket.chat.tgz -C /tmp
cd /tmp/bundle/programs/server && npm install
mv /tmp/bundle /opt/Rocket.Chat
useradd -M rocketchat && usermod -L rocketchat
chown -R rocketchat:rocketchat /opt/Rocket.Chat

touch /lib/systemd/system/rocketchat.service
echo "[Unit]
Description=The Rocket.Chat server
After=network.target remote-fs.target nss-lookup.target nginx.target mongod.target
[Service]
ExecStart=/usr/local/bin/node /opt/Rocket.Chat/main.js
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=rocketchat
User=rocketchat
Environment=MONGO_URL=mongodb://localhost:27017/rocketchat?replicaSet=rs01 MONGO_OPLOG_URL=mongodb://localhost:27017/local?replicaSet=rs01 ROOT_URL=https://$SITE/ PORT=3000
[Install]
WantedBy=multi-user.target" >> /lib/systemd/system/rocketchat.service

sed -i "s/^#  engine:/  engine: mmapv1/"  /etc/mongod.conf
sed -i "s/^#replication:/replication:\n  replSetName: rs01/" /etc/mongod.conf
systemctl enable mongod && systemctl start mongod
mongo --eval "printjson(rs.initiate())"
systemctl enable rocketchat && systemctl start rocketchat

#Configura Nginx

touch /etc/nginx/sites-available/$SITE
echo "# Upstreams
upstream $SITE {
    server 127.0.0.1:3000;
}

# HTTPS Server
server {
        listen 80;
    server_name $SITE;

    # You can increase the limit if your need to.
    client_max_body_size 200M;

    error_log /var/log/nginx/rocketchat.access.log;



    location / {
        proxy_pass http://$SITE/;
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
}" >> /etc/nginx/sites-available/$SITE
ln -s /etc/nginx/sites-available/$SITE /etc/nginx/sites-enabled/$SITE


echo "Iniciando Mongodb"
mongo --eval "printjson(rs.initiate())"
sleep 5
systemctl start rocketchat.service

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
