const { decryptMedia } = require('@open-wa/wa-decrypt')
const mime = require('mime-types')
const fs = require('fs')
const path = require('path')

async function processMedia(mensagem){
    let mediaToDecrypt = await decryptMedia(mensagem)
    let nameFile = (Math.floor(Math.random()*1000))+`.${mime.extension(mensagem.mimetype)}`
    fs.writeFileSync(path.join(__dirname, '../files/')+ nameFile, mediaToDecrypt, (err) => {
        if(err){
            return(err)
        }
    })
    console.log(nameFile)
    console.log('arquivo baixado!')
    return({
        'nameFile': nameFile,
        'pathToMedia': path.join(__dirname,'../files/') + nameFile,
    })
}

module.exports = processMedia