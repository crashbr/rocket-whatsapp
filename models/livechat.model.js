const mongoose = require ('mongoose');
const Schema = mongoose.Schema;

let livechatSchema = new Schema({
    userName: {
        type : String,
        require : false
    },
    userPhone: {
        type : String,
        require : true
    },
    userToken: {
        type : String,
        require : true
    },
    userMessage: {
        type :  String,
        require : false
    },
    userRoom: {
        type : String,
        require : false,
    },
    userRoomStatus: {
        type : String,
        require : false
    },
    messages: {
        rocket: {
            type: String,
            require: false
        },
        whatsapp: {
            type: String,
            require: false
        }
    }
}, {timestamps: true})

module.exports = mongoose.model('Livechat', livechatSchema);