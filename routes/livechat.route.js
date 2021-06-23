const express = require('express')
const router = express.Router();
const livechatController = require('../controllers/livechat.controller')
const whatsappController = require('../controllers/whatsapp.controller')
const { rotaEntrada, rotaSaida } = require('../config/config.json')

    router.post(rotaEntrada, livechatController.create);
    router.post(rotaSaida, livechatController.responde);
    router.post('/criaconversa', livechatController.criaconversa);
    router.get('/enviawhats', livechatController.enviawhats);
    router.post('/qrcode', whatsappController.qrcode);
    router.post('/connectstatus', whatsappController.connectstatus);
    router.post('/wp-commands', whatsappController.commands);
    router.post('/wp-messages', whatsappController.messages);

module.exports = router;
