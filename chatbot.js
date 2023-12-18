const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    jidDecode,
    proto,
    getContentType,
  } = require("@whiskeysockets/baileys");
  const pino = require("pino");
  const { Boom } = require("@hapi/boom");
  const { join } = require("path");
  const rimraf = require("rimraf");
  const PhoneNumber = require("awesome-phonenumber");
  require("dotenv").config();
  const PORT = process.env.PORT;
  const IP_ADDRESS = process.env.IP_ADDRESS;

  class BotProductsAI {
    constructor(sessionName, creds) {
      this.sessionName = sessionName || "whatsAppChatbot";
      this.donet = "";
      this.botNumber = creds;
      this.store = makeInMemoryStore({
        logger: pino().child({ level: "silent", stream: "store" }),
      });
      // this.messageQueues = {};
      // this.connectionState = "";
      // this.nameStore = ``;
      // this.configuration = {};
      // this.data = [];
      // this.contacts = [];
      // this.pausedContacts = [];
      // this.qr = undefined;
      // this.state = undefined;
      // this.status = undefined;
            this.start().then();
    }
  
    smsg(conn, m) {
      if (!m) return m;
      let M = proto.WebMessageInfo;
      if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith("@g.us");
        m.sender = conn.decodeJid(
          (m.fromMe && conn.user.id) ||
            m.participant ||
            m.key.participant ||
            m.chat ||
            ""
        );
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || "";
      }
      if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg =
          m.mtype == "viewOnceMessage"
            ? m.message[m.mtype].message[
                getContentType(m.message[m.mtype].message)
              ]
            : m.message[m.mtype];
        m.body =
          m.message.conversation ||
          m.msg.caption ||
          m.msg.text ||
          (m.mtype == "listResponseMessage" &&
            m.msg.singleSelectReply.selectedRowId) ||
          (m.mtype == "buttonsResponseMessage" && m.msg.selectedButtonId) ||
          (m.mtype == "viewOnceMessage" && m.msg.caption) ||
          m.text;
        let quoted = (m.quoted = m.msg.contextInfo
          ? m.msg.contextInfo.quotedMessage
          : null);
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.quoted) {
          let type = getContentType(quoted);
          m.quoted = m.quoted[type];
          if (["productMessage"].includes(type)) {
            type = getContentType(m.quoted);
            m.quoted = m.quoted[type];
          }
          if (typeof m.quoted === "string")
            m.quoted = {
              text: m.quoted,
            };
          m.quoted.mtype = type;
          m.quoted.id = m.msg.contextInfo.stanzaId;
          m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
          m.quoted.isBaileys = m.quoted.id
            ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16
            : false;
          m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
          m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
          m.quoted.text =
            m.quoted.text ||
            m.quoted.caption ||
            m.quoted.conversation ||
            m.quoted.contentText ||
            m.quoted.selectedDisplayText ||
            m.quoted.title ||
            "";
          m.quoted.mentionedJid = m.msg.contextInfo
            ? m.msg.contextInfo.mentionedJid
            : [];
          m.getQuotedObj = m.getQuotedMessage = async () => {
            if (!m.quoted.id) return false;
            let q = await this.store.loadMessage(m.chat, m.quoted.id, conn);
            return this.smsg(conn, q);
          };
          let vM = (m.quoted.fakeObj = M.fromObject({
            key: {
              remoteJid: m.quoted.chat,
              fromMe: m.quoted.fromMe,
              id: m.quoted.id,
            },
            message: quoted,
            ...(m.isGroup ? { participant: m.quoted.sender } : {}),
          }));
  
          /**
           *
           * @returns
           */
          m.quoted.delete = () =>
            conn.sendMessage(m.quoted.chat, { delete: vM.key });
  
          /**
           *
           * @param {*} jid
           * @param {*} forceForward
           * @param {*} options
           * @returns
           */
          m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
            conn.copyNForward(jid, vM, forceForward, options);
  
          /**
           *
           * @returns
           */
          m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
        }
      }
      // if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
      m.text =
        m.msg.text ||
        m.msg.caption ||
        m.message.conversation ||
        m.msg.contentText ||
        m.msg.selectedDisplayText ||
        m.msg.title ||
        "";
      /**
       * Reply to this message
       * @param {String|Object} text
       * @param {String|false} chatId
       * @param {Object} options
       */
      m.reply = (text, chatId = m.chat, options = {}) =>
        Buffer.isBuffer(text)
          ? conn.sendMedia(chatId, text, "file", "", m, { ...options })
          : conn.sendText(chatId, text, m, { ...options });
      /**
       * Copy this message
       */
      m.copy = () => this.smsg(conn, M.fromObject(M.toObject(m)));
  
      /**
       *
       * @param {*} jid
       * @param {*} forceForward
       * @param {*} options
       * @returns
       */
      m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
        conn.copyNForward(jid, m, forceForward, options);
  
      return m;
    }
  
    async start() {
      const NAME_DIR_SESSION = `${this.sessionName}_session`;
  
      const { state, saveCreds } = await useMultiFileAuthState(
        `./Sessions/${NAME_DIR_SESSION}`
      );
  
      const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        browser: ["Powered by CodeGPT with <3"],
        auth: state,
      });
      this.client = client;
  
      this.store.bind(client.ev);
  
      client.ev.on("messages.upsert", async (chatUpdate) => {
        //console.log(JSON.stringify(chatUpdate, undefined, 2))
        try {
          // Ultimo Mensaje
          let lastMessage = chatUpdate.messages[0];
          if (!lastMessage.message) return;
         
          //Recibio una llamada / evita errores
          if (
            lastMessage.messageStubType === 40 ||
            lastMessage.messageStubType === 41 
          ) {
            return;
          }
  
          //Ordena la data de un mensaje
          let msg = this.smsg(client, lastMessage);
         
          //Verificamos si el numero esta pausado PREGUNTAR SI NO PAUSA EN CUALQUIER BOT
          let endFlowByPausedContact = await verifyPauseContact(
            msg,
            this.pausedContacts,
            this.sessionName,
            this.botNumber
          );
  
          let cantMensajes;
          let mensaje;
          
          //Guarda todos los mensajes de BOTs 
          if (
            msg.mtype === `extendedTextMessage` ||
            msg.mtype === `conversation` ||msg.mtype === `locationMessage`
          ) {
            mensaje = {
              chatbotId: this.sessionName,
              createdAt: msg.messageTimestamp,
              name: msg.pushname,
              chatId: msg.chat.split("@")[0],
              sender: msg.sender,
              message_type: msg.mtype,
              location: msg.mtype === `locationMessage`?{
                x: msg.msg.degreesLatitude,
                y: msg.msg.degreesLongitude,
              }:"false",
              message: msg.text,
              isGroup: msg.isGroup,
              ai:msg.isBaileys
            };
            await saveAllMessage(mensaje);
          }
         
          //---No responder a los siguientes mensajes:
  
          //           Historias                     Grupo                Message
          if (msg.chat === "status@broadcast" || msg.isGroup || msg.mtype==="protocolMessage") return;
  
          // Si el contacto esta pausado 
          if (endFlowByPausedContact) {
            console.log(`El contacto +${msg.sender.replace("@s.whatsapp.net", "")} esta pausado`);
            return;
          }
  
          //---
          if (
            (msg.mtype === "conversation" ||
              msg.mtype === "extendedTextMessage" ||
              msg.mtype === "audioMessage") &&
            !msg.isBaileys &&
            !msg.fromMe
          ) {
            const chatId = msg.chat.replace("@s.whatsapp.net", "");
            let message;
  
            if (msg.mtype === "audioMessage") {
              message = await receiveAudio(this.sessionName, msg.msg);
            } else {
              message = msg.text;
            }
  
            if (!this.messageQueues[chatId]) {
              this.messageQueues[chatId] = [message];
            } else {
              this.messageQueues[chatId].push(message);
              const cantMensajes = this.messageQueues[chatId].length;
            }
          }
  
          //----Urgente: Si el bot de CRM recibe multimedia o documentos no rsponder y pausar
          if (
            !(
              msg.mtype === "conversation" ||
              msg.mtype === "extendedTextMessage" ||
              msg.mtype === "audioMessage"
            ) &&
            this.chatbotsCRM.includes(this.sessionName)
          ) {
            await client.sendText(
              msg.sender,
              "Pronto un representante se pondrá en contacto contigo."
            );
            console.log(`El contacto +${msg.sender.replace("@s.whatsapp.net", "")} fue pausado`);
  
            changePaused(
              this.sessionName,
              msg.sender.replace("@s.whatsapp.net", ""),
              "true"
            );
            changePausedDb(
              this.sessionName,
              msg.sender.replace("@s.whatsapp.net", "")
            );
            notifyWA({
              botId:this.sessionName,
              num: this.botNumber,
              sender: msg.sender,
              name: msg.pushName,
              email: "No registro",
            });
            return;
          }
          //----
  
          //Revisa el Status y Si el bot esta apagado, no responder
          if (this.state !== true || this.connectionState === "limit") return; // Esto toca probarlo mandando state a false en el front y llegando al limite de tokens.
        
          //Esto ya no se usa creo
          if (this.blockedNumbers.includes(this.botNumber)) {
            console.log(`Bot number ${this.botNumber} is blocked.`);
            return;
          }
  
          //Espera 20 segundo para acumular mensajes
          setTimeout(async () => {
            
            //Hay cola de mensajes con ese chat?
            if (
              !this.messageQueues[msg.chat.replace("@s.whatsapp.net", "")] ||
              this.messageQueues[msg.chat.replace("@s.whatsapp.net", "")].length >
                cantMensajes
            )
              return;
  
            const mensajesAnidados =
            this.messageQueues[msg.chat.replace("@s.whatsapp.net", "")].join(", ");
            this.messageQueues[msg.chat.replace("@s.whatsapp.net", "")].length = 0;
  
            if (mensajesAnidados) {
              msg.text = mensajesAnidados;
              verifyContactData(
                msg,
                this.contacts,
                this.pausedContacts,
                this.sessionName
              );
  
              //Enviamos el mensaje anidado a la IA
              await gpt(client, msg, chatUpdate, this.sessionName);
            }
          }, 20000);
        } catch (err) {
          console.log(err);
        }
      });
  
  
  
      // Setting
      client.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          let decode = jidDecode(jid) || {};
          return (
            (decode.user && decode.server && decode.user + "@" + decode.server) ||
            jid
          );
        } else return jid;
      };
  
      client.ev.on("contacts.update", (update) => {
        for (let contact of update) {
          let id = client.decodeJid(contact.id);
          if (this.store && this.store.contacts)
            this.store.contacts[id] = { id, name: contact.notify };
        }
      });
  
  
      //Si necesitamos el numero o el nombre completo
      client.getName = (jid, withoutContact = false) => {
       let id = client.decodeJid(jid);
        withoutContact = client.withoutContact || withoutContact;
        let v;
        if (id.endsWith("@g.us"))
          return new Promise(async (resolve) => {
            v = this.store.contacts[id] || {};
            if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
            resolve(
              v.name ||
                v.subject ||
                PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
                  "international"
                )
            );
          });
        else
          v =
            id === "0@s.whatsapp.net"
              ? {
                  id,
                  name: "WhatsApp",
                }
              : id === client.decodeJid(client.user.id)
              ? client.user
              : this.store.contacts[id] || {};
        return (
          (withoutContact ? "" : v.name) ||
          v.subject ||
          v.verifiedName ||
          PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
            "international"
          )
        );
      };
  
  
      //Cambia el estado de WS de un bot ej: Ocupado / Cerrado / Abierto
      client.setStatus = (status) => {
        client.query({
          tag: "iq",
          attrs: {
            to: "@s.whatsapp.net",
            type: "set",
            xmlns: "status",
          },
          content: [
            {
              tag: "status",
              attrs: {},
              content: Buffer.from(status, "utf-8"),
            },
          ],
        });
        return status;
      };
  
      client.public = true;
  
  
      client.diffusion = (receptor, campaign) => {
        receptor = `${receptor}@s.whatsapp.net`;
  
        client.sendMessage(receptor, {
          text: `${campaign.title}:
          
        ${campaign.content}`,
        });
  
        return this.botNumber;
      };
  
      client.serializeM = (m) => this.smsg(client, m);
  
  
      client.ev.on("connection.update", async (update) => {
  
        const { connection, lastDisconnect, qr } = update;
  
        if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.badSession) {
            console.log(`Bad Session File, Please Delete Session and Scan Again`);
            this.start();
          } else if (reason === DisconnectReason.connectionClosed) {
            // console.log("Connection closed, reconnecting....");
            this.start();
          } else if (reason === DisconnectReason.connectionLost) {
            // console.log("Connection Lost from Server, reconnecting...");
            this.start();
          } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(
              "Connection Replaced, Another New Session Opened, Please Restart Bot"
            );
            this.start();
          } else if (reason === DisconnectReason.loggedOut) {
            console.log(
              `Device Logged Out, Please Delete Folder Session  and Scan Again.`
            );
            const PATH_BASE = join(
              process.cwd(),
              `/Sessions/${NAME_DIR_SESSION}`
            );
            rimraf(PATH_BASE, (err) => {
              if (err) return;
            });
            this.start();
          } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart Required, Restarting...");
            this.start();
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection TimedOut, Reconnecting...");
            this.start();
          } else {
            console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
            this.start();
          }
        }
  
        if (connection === "open") {
  
  
          this.qr = false;
          quitarQr(false, this.sessionName);
          this.connectionState = "active";
          // Cambia a active y guarda el numero de telefono actual.
          console.log("antes de botnumber",this.botNumber)
          saveBotNumber(this.botNumber, "active", this.sessionName); 
  
          // Si el numero de la credencial cambia, saludar 
          if (this.botNumber !== client.decodeJid(client.user.id)) {
            
            //---Envia por socket info para saludar nuevo Bot Numero y Nombre
            numWA({
              num: client.decodeJid(client.user.id),
              name: this.nameStore,
            });
            //---
            
            this.botNumber = await client.decodeJid(client.user.id);
          }
        }
  
  
        /** QR Code */
        if (qr) {
          // if (this.sessionName === "prueba1") console.log("STATE",this.connectionState)
          this.qr = qr;
          createQr(qr, this.sessionName);
  
          if (this.connectionState === "active") {
            saveBotNumber(this.botNumber, "inactive", this.sessionName);
            this.connectionState = "inactive";
          }
        }
  
      });
  
  
      //Actualiza las credenciales cuando se vincula un nuevo numero
      client.ev.on("creds.update", saveCreds);
  
      //Para enviar mensajes recibe numero@ws y texto
      client.sendText = (jid, text, quoted = "", options) =>
        client.sendMessage(jid, { text: text, ...options });
  
      //Si algun dia manejamos especie de consola dentro del mismo BOT 
      client.cMod = (
        jid,
        copy,
        text = "",
        sender = client.user.id,
        options = {}
      ) => {
        let M = proto.WebMessageInfo;
        //let copy = message.toJSON()
        let mtype = Object.keys(copy.message)[0];
        let isEphemeral = mtype === "ephemeralMessage";
        if (isEphemeral) {
          mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
        }
        let msg = isEphemeral
          ? copy.message.ephemeralMessage.message
          : copy.message;
        let content = msg[mtype];
        if (typeof content === "string") msg[mtype] = text || content;
        else if (content.caption) content.caption = text || content.caption;
        else if (content.text) content.text = text || content.text;
        if (typeof content !== "string")
          msg[mtype] = {
            ...content,
            ...options,
          };
        if (copy.key.participant)
          sender = copy.key.participant = sender || copy.key.participant;
        else if (copy.key.participant)
          sender = copy.key.participant = sender || copy.key.participant;
        if (copy.key.remoteJid.includes("@s.whatsapp.net"))
          sender = sender || copy.key.remoteJid;
        else if (copy.key.remoteJid.includes("@broadcast"))
          sender = sender || copy.key.remoteJid;
        copy.key.remoteJid = jid;
        copy.key.fromMe = sender === client.user.id;
  
        return M.fromObject(copy);
      };
  
      //---Escuchar eventos del socket
      this.socket.on("numwa", async (newBotNumber) => {
        if (this.productosAINumber === this.botNumber) {
          
          const welcomeMessage = `¡Hola ${newBotNumber.name} 👋,\nBienvenido/a a ProductosAI! 🤖\n\nHas vinculado tu WhatsApp correctamente.\n\nPara empezar a interactuar con tu chatbot, simplemente envía un mensaje desde otro número de teléfono a tu número de WhatsApp.\n\nEstaré aquí para ayudarte a sacar el máximo potencial de ProductosAI para tu negocio 🫡\n\nEstaré a solo un mensaje de distancia ☺️`;
  
          await client.sendText(newBotNumber.num, welcomeMessage);
        }
      });
  
      this.socket.on("notify", async (notify) => {
  
        if (this.productosAINumber === this.botNumber) {
  
          //Notificacion de CRM
          if (typeof notify.product === "undefined") {
            const notifyMessage = `¡Excelente noticia, este prospecto esta listo para asignar!
            \nNúmero del Cliente: +${notify.sender.replace(
              "@s.whatsapp.net",
              ""
              )}\nNombre del Cliente: ${notify.name}\nEmail: ${notify.email}`;
            
              if (notify.botId==="bb09a009-5560-4ee3-91cd-1d9d6c910d28") {
                await client.sendText(`5493875316726@s.whatsapp.net`, notifyMessage);
                return
              }
        
              
            await client.sendText(`573002682180@s.whatsapp.net`, notifyMessage);
            if (notify.botId === "ab6a15dd-b9d7-4765-acc6-1189c01e1e1f") {
              
              await client.sendText(`573104985613@s.whatsapp.net`, notifyMessage);
              return
            }
            
  
          } else {
  
            //Notificacion de compra
            const notifyMessage = `¡Excelente noticia, se ha concretado una venta!
            \nNúmero del Cliente: +${notify.sender.replace(
              "@s.whatsapp.net",
              ""
            )}\nNombre del Cliente: ${notify.name}\nProductos Adquiridos: ${
              notify.product
            }\nMonto Total: ${notify.price}`;
            await client.sendText(notify.num, notifyMessage);
          }
        }
      });
  
      //---
  
      return client;
    }
  }
  
  module.exports = BotProductsAI;
  