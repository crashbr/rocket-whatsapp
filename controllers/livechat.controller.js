const Livechat = require('../models/livechat.model')
const fs = require('fs')
const path = require('path')
const AsyncLock = require('node-async-locks').AsyncLock
const lock = new AsyncLock()
const qs = require('qs')
const axios = require("axios")
const nodemailer = require('nodemailer')
let FormData = require('form-data')
const processMedia = require('../helpers/processMedia')
const joypixels = require('emoji-toolkit')
const { rocket, whatsapp, ips, agentePadrao, deptoTriagem, assinaWhats, whatsappSession, whatsappApi, authId, authToken, notificaTriagem, mailHost, mailPort, mailUser, mailPass } = require('../config/config.json')
const headersToReceive = {'headers':{'Content-Type': 'application/json'}}
const headersToSend = {'Content-Type':'application/x-www-form-urlencoded','session': whatsappSession,'apikey':whatsappApi}

	async function sendMail(mensagemEmail){
		const server = nodemailer.createTransport({
			host: mailHost,
			port: mailPort,
			secure: false,
			auth: {
				user: mailUser,
				pass: mailPass
			},
			tls: {
				rejectUnauthorized: false
			}
		})
		const mailOptions = {
			from: mailUser,
			to: 'email@dominio.com',
			subject: `Erro Rocket ${assinaWhats}`,
			text: mensagemEmail
		}

		server.sendMail(mailOptions,((error, info) => {
			if (error) {
				console.log(error)
			} else {
				console.log('Email sent')
			}
		}))
	}

	async function registraVisitante(token){
			let data = {"visitor":{"token": token, "phone": token, "department":deptoTriagem}}
			await axios.post(rocket+'/api/v1/livechat/visitor',data, headersToReceive)
			await avisaTriagem()
	}

	async function abrirSala(token, message, whatsAppId){
		try{
			let retornoSala = await axios.get(rocket+'/api/v1/livechat/room?token='+token, headersToReceive)
			let rid = retornoSala.data.room._id
			await insereRid(rid, token, message, whatsAppId)
		} catch (err) {
			sendMail('Erro ao registrar visitante')
			console.error(err)
		}
	}
	
	async function insereRid(rid,token,message,whatsAppId){
		let userToken = token
		let userRoom = rid
		await Livechat.findOneAndUpdate( {"userToken" : userToken, "userRoomStatus" : "open"}, {"userRoom": userRoom} )
		await enviarMensagem(token,rid,message,whatsAppId)
	}

	async function atualizaSalaMongo(token, message, whatsAppId){
		await Livechat.updateMany( {"userToken" : token, "userRoomStatus" : "open"}, {"userRoomStatus": "close"} )
		sleep(200)
		await main(token,message,whatsAppId)
	}

	async function enviarMensagem(token, rid, message, whatsAppId){
		try {
			if(typeof(message) === 'object'){
				let pathToMedia = message.pathToMedia
				let description = message.description
				let checkStatus = await uploadMedia(token, rid, pathToMedia, description)
				if(checkStatus === 'erro'){
					console.log("Sala fechada.")
					atualizaSalaMongo(token, message, whatsAppId)
				}
				return
			}
		 } catch (err) {
			if(err.response.status == 400){
				sendMail('Tipo de upload não autorizado no envio de mensagens')
			}
			return
		} 

		let data = {"token":token,"rid":rid,"msg":message}
		try{
			let retornoMessage = await axios.post(rocket+'/api/v1/livechat/message', data, headersToReceive)
			let rocketMsgId = retornoMessage.data.message._id
			await Livechat.updateOne(
				{"userToken":token, "userRoomStatus":"open"},{$push: {messages: {"rocket":rocketMsgId,"whatsapp":whatsAppId}}}
			)
		} catch (err) {
			console.log('Erro ao reabrir a sala',err)
			if(err.response.data.message === "[room-closed]" || err.response.data.message == "[invalid-room]" || err.response.data.message == "Match error: Missing key 'rid'"){
				atualizaSalaMongo(token, message, whatsAppId)
			}
			else if(err.response.status == 400){
				sendMail("Erro ao enviar mensagem de texto/contato")
				console.log("Mensagem não autorizada recebida.")
			}
		}
	}

	async function avisaTriagem(){
		let url = rocket + '/api/v1/chat.sendMessage'
		let dataToNotify = {"message":{"rid":notificaTriagem, "msg":"Nova mensagem"}}
		await axios.post(url,dataToNotify,{'headers': {'Content-Type': 'application/json','X-Auth-Token': authToken,'X-User-Id': authId}})
	}

	async function respondeMessage(message,whatsmidia){
		try{
			await axios.post(whatsmidia, qs.stringify(message), {'headers': headersToSend})
		} catch(err){
			sendMail('Erro ao responder mensagem')
			console.log(err)
		}
	}

	function sleep(ms) {
		return new Promise((resolve) => {
		setTimeout(resolve, ms)
		})
	}  

	
	async function main(token, message, whatsAppId){
		try {
			await registraVisitante(token)
			await abrirSala(token,message, whatsAppId)
		} catch (error) {
			console.log(error)
		}
	}
	
	async function registraBanco(banco) {
		let tokenPhone = banco.from.split('@')[0]
		let livechat = new Livechat (
			{
				userPhone: tokenPhone,
				userToken: tokenPhone,
				userRoomStatus : "open"
			}
			)
			await livechat.save()
		}
		
	async function uploadMedia(token, rid, fileReceived, description = '') {
		let url = rocket + '/api/v1/livechat/upload/' + rid
		let data = new FormData()
		let fileToUpload = fileReceived
		data.append('file', fs.createReadStream(fileToUpload))
		data.append('msg', description)
		try {
			await axios.post(url, data, {'headers': {'Content-Type': `multipart/form-data; boundary=${data._boundary}`,'x-visitor-token':token}, 'maxContentLength': 'Infinity', 'maxBodyLength': 'Infinity'})
			return ('sucesso')
		} catch (err) {
			if(err.response.data.error){
				if (err.response.data.error  == "webp2vips: unable to read pixels\n"){
					sendMail('Erro no upload de arquivo')
				return
				}				
			} else {
				sendMail('Erro não identificado gerado pelo Rocket no upload do arquivo')
				return
			}
			return('erro')
		}
	}


	async function verificaTipoMensagem(webhook){

		if (webhook.quotedMsg){
			if(webhook.type === 'chat' && webhook.quotedMsg.type === 'chat'){
				return (`*Mensagem original:*\n${webhook.quotedMsg.body}\n\n *Resposta:*\n${webhook.content}`)
			}
		
			if (webhook.type === 'chat' && (webhook.quotedMsg.mimetype)) {

				let mediaData = await processMedia(webhook.quotedMsgObj)
			
				let media = {
					'fileName' : mediaData.nameFile,
					'pathToMedia' : mediaData.pathToMedia,
					'description' :  `*Resposta na midia:*\n${webhook.content}`
				}
					
				return media

				}

				if ((webhook.mimetype) && webhook.quotedMsg.type === 'chat') {
		
					let mediaData = await processMedia(webhook)
						
					let media = {
						'fileName' : mediaData.nameFile,
						'pathToMedia' : mediaData.pathToMedia,
						'description' :  `*Mensagem original:*\n${webhook.quotedMsg.body}`
					}
						
					return media
		
					}
			}

		if (webhook.mimetype) {

			let mediaData = await processMedia(webhook)
			
			let media = {
				'fileName' : mediaData.nameFile,
				'pathToMedia' : mediaData.pathToMedia,
				'description' : '*' + webhook.caption +'*'
			}
					
			return media
		}

		else if (webhook.type == "vcard"){
			return webhook.body
		}

		else if (webhook.author){
			return webhook.author.split('@')[0]+ ' - ' + '*' + webhook.sender.name+ ':*\n' + webhook.content
		}

		else if (webhook.type == 'link'){
			return qs.stringify(webhook.url)
		}
		 else {
			return webhook.body
		}
	}

	async function iniciaConversa(webhook){
		// console.log( `webhook\n from: ${webhook.from}\n type: ${webhook.type}` )
		console.log(webhook)
		const message = await verificaTipoMensagem(webhook)
		const token = webhook.from.split('@')[0]
		const whatsAppId = webhook.id
		
		let consulta = await Livechat.find( {"userToken" : token} ).sort({createdAt:-1}).limit(1)

		if (webhook.from == 'status@broadcast'){
			console.log('Status')
			
		} else {

			if (consulta.length == 0){

				console.log("Nova Sala")
				await registraBanco(webhook)
				await main(token,message,whatsAppId)

			} else {
				let status = consulta[0].userRoomStatus
			
				if (status === "open") {
					console.log("Reabre Sala")
					let rid = consulta[0].userRoom
					await enviarMensagem(token, rid, message, whatsAppId)

				} else {
					await registraBanco(webhook)
					await main(token,message,whatsAppId)
				}
			}
		}
	}

	exports.create = async function(req,res) {
		let webhook = req.body

		lock.enter(function (token) {
			console.log("mensagem recebida")
			iniciaConversa(webhook)
			.then(()=>{
				lock.leave(token)
				console.log("terminou de processar")
				res.status(200).end()
			})
		})
	}

	exports.responde = async function(req,res) {
		console.log( 'webhook para resposta', 'Room id',req.body._id, 'Conteudo',req.body.messages)
		let channel = req.body.visitor.token

		let verificaTipo = req.body.messages[0].attachments

		if(req.body.messages[0].closingMessage){
			try{
				await Livechat.updateMany( {"userToken" : req.body.visitor.token, "userRoomStatus" : "open"}, {"userRoomStatus": "close"} )
				console.log('sala fechada')
			} catch (err) {
				console.log(err)
			}
		}

		if (typeof verificaTipo == 'undefined') {
			// Se undefined quer dizer que a mensagem é apenas de texto.
			if(typeof req.body.agent == 'undefined'){
				var agente = agentePadrao
			} else {
				var agente = req.body.agent.name
			}

			let textToValidate = req.body.messages[0].msg.slice(0,3)
			if(textToValidate === '[ ]'){
				let idParaConsulta = req.body.messages[0].msg.split('=')[1].split(')')[0]
 				let consulta = await Livechat.find( {"userToken" : channel, "userRoomStatus":"open"} )
				let whatsParaResposta
				if((consulta[0].messages.toObject().filter((obj)=> obj.rocket == idParaConsulta)[0]) === undefined){
					//Se for uma midia não tem o rocketID atrelado, então da um erro. Enviando apenas o texto ou midia por enquanto.
					var whatsmidia = whatsapp+"/send/text"
					var message = {
						'number' : channel,
						'text' : joypixels.shortnameToUnicode("[ *"+agente+"* ]"+"\n\n"+req.body.messages[0].msg)
					}
				} else {
					whatsParaResposta = consulta[0].messages.toObject().filter((obj)=> obj.rocket == idParaConsulta)[0].whatsapp
				}
				var whatsmidia = whatsapp+"/reply"
				var message = {
					'number' : channel,
					'messageid': whatsParaResposta,
					'text' : joypixels.shortnameToUnicode("[ *"+agente+"* ]"+"\n\n"+req.body.messages[0].msg.split(')')[1])
				}
			} else {
				var whatsmidia = whatsapp+"/send/text"
				var message = {
					'number' : channel,
					'text' : joypixels.shortnameToUnicode("[ *"+agente+"* ]"+"\n\n"+req.body.messages[0].msg)
				}
			}
		} else {

			var midia = req.body.messages[0].fileUpload.publicFilePath
			console.log(midia)
			var json = req.body.messages[0].attachments[0]

			if ("audio_url" in json) {
				var whatsmidia = whatsapp+"/send/file"
				var message = {
					"number" : channel,
					"url" : midia
				}
			}
			else if ("image_url" in json){
				var whatsmidia = whatsapp+"/send/file"
				var message = {
					"number" : channel,
					"url" : midia
				}
			}
			else if ("video_url" in json){
				var whatsmidia = whatsapp+"/send/file"
				var message = {
					"number" : channel,
					"url" : midia
				}
			} else {
				var tipoDoc = path.extname(json.title_link).replace('.','')
				var whatsmidia = whatsapp+"/send/file"
				var nomeArquivo = json.title_link.split('/')
				var message = {
					"number" : channel,
					"url" : midia
				}
			}
		}
		respondeMessage(message,whatsmidia)
		res.status(200).end()
	}

	exports.criaconversa = async function (req,res) {
		//Rota para criar mensagens por fora do Rocket. Quando o cliente responder, já vai cair no LiveChat.
		console.log("Nova Conversa", req.body)
		var telefone = "55"+req.body.telefone+"@c.us"
		var message = 'Contato iniciado por '+ assinaWhats

		let whatsmidia = whatsapp+"/send/text"
		let contentWhats = {'number':telefone.split('@')[0],'text':message}

		let urlRocket = rocket+":9000/tghomolog"
		let contentRocket = {"from":telefone, 'type': 'chat', "body":message}
		
		try {
			await respondeMessage(contentWhats, whatsmidia)
			await axios.post(urlRocket, contentRocket, headersToReceive)
			console.log(res.status, "Chat iniciado com sucesso.")
		} catch (error) {
			if(err.message === 'socket hang up'){
				console.log(err.message)
				sendMail('socket hangup')
				res.end()
				return
			}
			console.log('ERRO DO ROCKET',err)
		}
	}

	exports.enviawhats = async function (req, res){
		var ipAutorizado = ips
		let ipRemoto = req.connection.remoteAddress.replace(/^.*:/,'')
		if (ipAutorizado.includes(ipRemoto)){
				res.writeHeader(200,{
					'Content-Type':'text/html'
				})
				fs.readFile('./views/enviawhats.html', null, function(error, data){
					if (error){
						console.log(error)
						res.write('Algo deu errado')
					} else {
						res.write(data)
					}
					res.end()
				})
		} else {
			console.log('IP não autorizado tentando acessar')
		}
	}
