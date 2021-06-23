const fs = require('fs')
const axios = require("axios")
let FormData = require('form-data')
const qs = require('qs')
const { rocket, authToken, authId, whatsappRocketRoom, whatsapp, rotaEntrada, whatsappApi, whatsappToken, whatsappSession } = require('../config/config.json')
const headersVenom = {
    'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'session': whatsappSession,
        'token': whatsappToken,
        'apikey': whatsappApi
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
    setTimeout(resolve, ms)
    })
}  

async function connect(){
    let url = whatsapp + '/connect'
    url = url.toString()

    let data = {
            wh_connect: rocket + ':9000/connectstatus',
            wh_qrcode: rocket + ':9000/qrcode',
            wh_status: rocket + ':9000/wp-messages',
            wh_message: rocket + ':9000' + rotaEntrada
        }

    await axios.post(url, qs.stringify(data), headersVenom)
    .then((res) => {
        console.log(res)
    })
    .catch((err) => {
        console.log(err)
    })
}

async function disconnect(){
    let url = whatsapp + '/disconnect'
    let data = {}

      axios.post(url, data, headersVenom)
      .then((res)=>{
          console.log(res)
      })
      .catch((err) => {
          console.log(err)
      })
}

async function unreadMessages(){
    let url = whatsapp + '/unreadmessages'
    let data = {}

    await axios.post(url, data, headersVenom)
    .then((res) => {
        console.log(res.data)
    })
    .catch((err) => {
        console.log("Gerou erro para receber as mensagens.",err)
    })
}

exports.qrcode = async function (req, res){
    console.log(req.body)
    let base64String = req.body.qrcode
    let base64Image = base64String.split(';base64,').pop();
    fs.writeFileSync('files/qrcode.png', base64Image, {encoding: 'base64'}, ((err) => { console.log('arquivocriado')}))

    let url = rocket + '/api/v1/rooms.upload/' + whatsappRocketRoom
    let data = new FormData()
    let fileToUpload = 'files/qrcode.png'
    data.append('file', fs.createReadStream(fileToUpload))
    let uploadReturn
    uploadReturn = await axios.post(url, data, {'headers': {'Content-Type': `multipart/form-data; boundary=${data._boundary}`,'X-Auth-Token': authToken,'X-User-Id': authId}, 'maxContentLength': 'Infinity', 'maxBodyLength': 'Infinity'})
    .then((res) => {
        return ('sucesso')
    })
    .catch((err) => {
        return ('erro')
    })
    res.send('OK')
}

exports.connectstatus = async function (req, res){
    console.log(req.body)
    let connectionStatus = req.body.status
    let url = rocket+'/api/v1/chat.sendMessage'
    let data = {"message":{"rid": whatsappRocketRoom, "msg": "*"+connectionStatus+"*"}}
    axios.post(url, data, {"headers":{
        'Content-Type': 'application/json',
        'X-Auth-Token': authToken,
        'X-User-Id': authId
      }})
    res.send('OK')
}

exports.commands = async function(req, res){
    console.log(req.body)
    let command = req.body.comando
    switch (command) {
        case 'reiniciar':
            await disconnect()
            await sleep(10000)
            await connect()
            break;
        case 'conectar':
            await connect()
            break;
        
        case 'serverClose':
            await disconnect()
            await sleep(10000)
            await connect()
            break;

        case 'browserClose':
            await disconnect()
            await sleep(10000)
            await connect()
            break;

        case 'naolidas':
            await unreadMessages()
            break;

        case 'isLogged':
            await unreadMessages()
            break;
    
        default:
            break;
    }
    res.send('OK')
}

exports.messages = async function(req,res){
    //console.log(req.body)
    res.send('Recebido')
}
