const { rocket } = require('./config/config.json')
const express = require( 'express' )
const app = express()
const https = require('https')
const mongoose = require('mongoose')
const fs = require('fs')
const credentials = { // criar certificado utilizando o letsencrypt
	key: fs.readFileSync('/etc/letsencrypt/live/'+rocket.replace('https://','')+'/privkey.pem', 'utf8'),
	cert: fs.readFileSync('/etc/letsencrypt/live/'+rocket.replace('https://','')+'/fullchain.pem', 'utf8')
}
const httpsServer = https.createServer(credentials, app)

	mongoose.connect("mongodb://localhost/livechat", { useNewUrlParser: true, useUnifiedTopology:true, useCreateIndex:true, useFindAndModify: false})
	const db = mongoose.connection
	db.on('error', (err) => console.log(err))
	db.once('open', ()=> console.log('Database Connected'))
	
app.use(express.json({limit: '50mb'}))
const livechatRouter = require('./routes/livechat.route')
app.use('/',livechatRouter)

httpsServer.listen(9000, () => console.log('Node.js server started on port 9000.'))