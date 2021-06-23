# rocketchat<->whatsapp

## Criar os canais abaixo dentro do Rocket.chat

#### #whatsapp 
Neste são inseridos os comandos para reiniciar a API de backend. Comandos: conectar, reiniciar e naolidas(recuperar todas as mensagens não lidas no whatsapp)

#### #enviawhats 
Formato para iniciar conversa com cliente 119XXXXXXXX

#### #notificatriagem

### Parâmetros no arquivo config/config.json

```json
{
    "rocket":"URL do seu rocket.chat",
    "whatsapp":"URL da API do whatsapp",
    "whatsappSession" : "Sessão do whatsapp",
    "whatsappApi" : "Token API",
    "whatsappToken": "Token backend",
    "ips": "IPs liberados para rota de enviawhats (desativado)",
    "rotaEntrada":"/rotadeentrada",
    "rotaSaida":"/rotadesaida(config de webhooks)",
    "agentePadrao":"Erik Silva Sobral",
    "deptoTriagem":"ID do depto de triagem",
    "assinaWhats": "Erik Silva Sobral",
    "authToken" : "Token(senha) de autorização do BOT que vai enviar mensagens para o canal whatsapp(comandos)",
    "authId": "ID(user) do BOT que vai enviar mensagens para o canal do whatsapp (comandos)",
    "whatsappRocketRoom": "ID do canal #whatsapp",
    "notificaTriagem": "ID do canal #enviawhats",
    "mailHost": "host para envio de e-mails com erros",
    "mailPort" : "587",
    "mailUser" : "user",
    "mailPass" : "pass"
}
```
