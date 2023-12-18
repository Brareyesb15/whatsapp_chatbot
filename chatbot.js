import { Boom } from "@hapi/boom";

import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  WAMessageStubType,
  delay,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";

const MAIN_LOGGER = require("@whiskeysockets/baileys/lib/Utils/logger").default;

import { Bot } from "../../chatbots/entities/bot.entity";
import * as fs from "fs-extra";
import { BotService } from "../../chatbots/services/bot.service";
import * as ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import * as fluentFfmpeg from "fluent-ffmpeg";

export class WhatsappGateway {
  constructor(

  ) {
  }
  private logger: any;
  private store: any;
  private bot: Bot;
  public client: any;
  private messageQueues = {};
  private messageKeyQueues: any[] = [];
  private WHATSAPP_FORMAT_PHONE = "@s.whatsapp.net";
  private TIME_TO_WAIT: number = Number(process.env.TIME_TO_WAIT_RESPONSE);

  private async handleAppEvent(event: { eventName: string; eventData?: any }) {
    const { eventName, eventData } = event;
    try {
      if (eventName == AppEvent.notifyAction) {
        this.loggerService.info(`entramos a evento notify`);
        const { message, number, chatbotId } = eventData;
        if (this.bot.chatbotId !== chatbotId) return;
        this.loggerService.info(
          `parametros ${message} ${number}, ${chatbotId}`
        );
        await this.client.sendText(
          `${number}${this.WHATSAPP_FORMAT_PHONE}`, // Estos eventos hacen lo mismo! Mandar un mensaje...
          message
        );
      }

      if (eventName == AppEvent.numwaAction) {
        const { message, number, chatbotId } = eventData;
        if (this.bot.chatbot.chatbotId !== chatbotId) return;
        await this.client.sendText(
          `${number}${this.WHATSAPP_FORMAT_PHONE}`,
          message
        );
      }
      if (eventName === AppEvent.sendMessageAction) {
        const { message, number, chatbotId } = eventData;
        const id = this.bot.chatbot.chatbotId;
        if (id === chatbotId) {
          await this.client.sendText(
            `${number}${this.WHATSAPP_FORMAT_PHONE}`,
            message
          );
        }
      }
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private connectionMap: Record<string, Function> = {
    open: async (parameters: any) => {
      await this.openConnection(parameters);
    },
    close: async (parameters: any) => {
      await this.closeConnection(parameters);
    },
    connecting: (parameters: any) => {},
    default: async (parameters: any) => {
      await this.defaultConnection(parameters);
    },
  };

  public configure(bot: Bot): this {
    this.bot = bot;
    return this;
  }

  public async stop(): Promise<void> {
    this.client = null; // averiguar
    //todo lo que sea necesario para matarlo
  }

  public async start() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        `./Sessions/${this.bot.chatbotId}`
      );

      this.client = makeWASocket({
        // logger: this.logger,
        printQRInTerminal: JSON.parse(process.env.PRINT_QR_IN_TERMINAL),
        browser: ["Productos AI - BOT", "Safari", "5.1.7"],
        auth: state,
      });

      this.client.public = true;

      // // Handle error
      // const unhandledRejections = new Map();
      // process.on("unhandledRejection", (reason, promise) => {
      //   unhandledRejections.set(promise, reason);
      //   this.loggerService.info(
      //     "Unhandled Rejection at:" + promise + "reason:" + reason
      //   );
      // });
      // process.on("rejectionHandled", (promise) => {
      //   unhandledRejections.delete(promise);
      // });
      // process.on("Something went wrong", function (err) {
      //   this.loggerService.info("Caught exception: " + err);
      // });
      // // Handle error

      this.client.decodeJid = (jid) => {
        try {
          if (!jid) return jid;
          if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (
              (decode["user"] &&
                decode["server"] &&
                decode["user"] + "@" + decode["server"]) ||
              jid
            );
          } else return jid;
        } catch (error) {
          this.loggerService.error(error);
        }
      };

      this.client.ev.on("messages.upsert", async (chatUpdate) => {
        try {
          let lastMessage = chatUpdate.messages[0];
          const message = this.smsg(this.client, lastMessage);
          console.table(
            "----------------------------------------------------------------"
          );
          console.table(message.text);
          console.table(message.mtype);
          console.table(
            "----------------------------------------------------------------"
          );

          if (
            !(
              message.mtype === "conversation" ||
              message.mtype === "extendedTextMessage" ||
              message.mtype === "audioMessage"
            ) &&
            this.bot.chatbot.tags.includes("datacrm")
          ) {
            if (await this.isContactPaused(message)) return;
            if (!(await this.isValidMessage(message))) return;

            await this.client.sendText(
              message.sender,
              process.env.OPERATOR_MESSAGE
            );

            await this.botService.pauseContact(
              this.bot.chatbotId,
              message.sender
            );
            return;
          }

          //validations
          if (
            !(await this.isAvailable()) ||
            (await this.isContactPaused(message)) ||
            !(await this.isValidMessage(message))
          ) {
            return;
          }

          const allowedMessageTypes = [
            MessageType.Text,
            MessageType.Chat,
            MessageType.Location,
          ];
          if (allowedMessageTypes.includes(message.mtype)) {
            await this.saveConversation(message);
          }

          if (message.isBaileys) {
            return;
          }

          const allowedMessageTypeToProcess = [
            MessageType.Text,
            MessageType.Chat,
            MessageType.Audio,
          ];

          if (message.fromMe) {
            await this.pauseContact(message.sender);
            return;
          }

          let countMessage = 0;
          if (
            allowedMessageTypeToProcess.includes(message.mtype) &&
            !message.fromMe
          ) {
            const messageToSend = await this.buildMessage(message);

            const chatId = message.chat.replace(this.WHATSAPP_FORMAT_PHONE, "");
            if (!this.messageQueues[chatId]) {
              this.messageQueues[chatId] = [messageToSend];
              countMessage = 1;
            } else {
              this.messageQueues[chatId].push(messageToSend);
              countMessage = this.messageQueues[chatId].length;
            }
            this.messageKeyQueues.push(message.key);
          } else {
            return;
          }

          //waiting
          setTimeout(async () => {
            const chat = message.chat.replace(this.WHATSAPP_FORMAT_PHONE, "");
            if (
              !this.messageQueues[chat] ||
              this.messageQueues[chat].length > countMessage
            ) {
              return;
            }

            const nestedMessages = await this.messageQueues[chat].join(", ");
            this.messageQueues[chat].length = 0;

            if (nestedMessages) {
              message.text = nestedMessages;
              await this.saveContact(message);
              const content = await this.createChat(message);
              this.botService.updateChatbotResponse(this.bot.chatbotId);

              //blue marked
              await this.client.readMessages(this.messageKeyQueues);
              this.messageKeyQueues = [];
              const resDelay = await this.calculateDelay(content);
              this.client.sendPresenceUpdate(
                "composing",
                message.key.remoteJid
              );
              delay(resDelay);
              setTimeout(async () => {
                try {
                  if (
                    this.bot.chatbot.connectionState !== ConnectionStatus.Active
                  )
                    return;
                  const fetchStatus = await this.client.fetchStatus(
                    message.key.remoteJid
                  );
                  message.reply(content);
                } catch (error) {
                  this.loggerService.error(error);
                }
              }, resDelay);
              if (this.bot.chatbot.connectionState !== ConnectionStatus.Active)
                return;
              this.client.sendPresenceUpdate("pause", message.key.remoteJid);
            }
          }, this.TIME_TO_WAIT);
        } catch (error) {
          this.loggerService.error(error);
        }
      });

      this.client.ev.on("connection.update", async (update) => {
        try {
          const { connection } = update;
          const fn =
            this.connectionMap[connection] || this.connectionMap["default"];
          fn(update);
        } catch (error) {
          this.loggerService.error(error);
        }
      });

      this.client.ev.on("creds.update", saveCreds);

      //Para enviar mensajes recibe numero@ws y texto
      this.client.sendText = (jid, text, quoted = "", options) =>
        this.client.sendMessage(jid, { text: text });
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async pauseContact(sender: string): Promise<void> {
    try {
      await this.botService.pauseContact(this.bot.chatbotId, sender);
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async buildMessage(message: any): Promise<string> {
    if (message.mtype === MessageType.Audio) {
      const audioMessage = await this.receiveAudio(
        this.bot.chatbotId,
        message.msg
      );
      return audioMessage;
    } else {
      return message.text;
    }
  }

  private async openConnection(parameters: any): Promise<void> {
    try {
      await this.appEvent.emitEvent(AppEvent.sessionConnectAction);
      this.bot.qr = null;
      this.bot.connectionState = ConnectionStatus.Active;
      const botNumber = this.client
        .decodeJid(this.client.user.id)
        .replace(this.WHATSAPP_FORMAT_PHONE, "");
      this.bot.chatbot.actualNumber = botNumber;

      if (!this.bot.chatbot.numbers.includes(botNumber)) {
        const message = await this.welcomeMessage(
          this.bot.chatbotConfiguration.storeName
        );
        const number = `${this.bot.chatbot.actualNumber}`;
        this.appEvent.emitEvent(AppEvent.sendMessageAction, {
          message,
          number,
          chatbotId: "pai", // Cambié esto, estabamos enviando el mensaje de bienvenido desde el mismo numero y debe ser PAI.
        });
        this.bot.chatbot.numbers.push(this.bot.chatbot.actualNumber);
      }

      // posiblemente ponerlo acá y actualizarlo con todo lo necesario ( status, numero etc.)
      await this.botService.updateChatbot(this.bot.chatbot);
      //TODO: UPDATE BOT NUMBER
      //OBTENEMOS TODOS LOS CHATBOS QUE TENGAN ESTE NUMERO, Y LOS BORRAMOS Y LE CAMBIAMOS EL ESTADO
      // TAMBIEN CAMBIARLO EN LOS OTROS GTWS

      this.appEvent.emitEvent(AppEvent.qrConnectedAction, {
        chatbotId: this.bot.chatbotId,
      });
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async closeConnection(parameters: any): Promise<void> {
    try {
      const { lastDisconnect } = parameters;
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        // await this.appEvent.emitEvent(AppEvent.sessionDisconnectAction);
        this.bot.chatbot.actualNumber = "none";
        this.bot.chatbot.connectionState = "inactive";
        await this.botService.updateChatbot(this.bot.chatbot);
        const folderToDelete = `./Sessions/${this.bot.chatbotId}`;
        fs.remove(folderToDelete)
          .then(() => {})
          .catch((error) => {});
      } else {
      }
      this.start();
    } catch (error) {
      this.loggerService.error(error);
      this.start();
    }
  }

  private async defaultConnection(parameters: any): Promise<void> {
    try {
      const { qr } = parameters;
      if (qr) {
        this.bot.qr = qr;
        this.appEvent.emitEvent(AppEvent.newQRAction, {
          chatbotId: this.bot.chatbotId,
          qr: qr,
        });
      }
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async isAvailable(): Promise<boolean> {
    if (
      this.bot.state !== true ||
      this.bot.connectionState === ConnectionStatus.Limit
    ) {
      return false;
    }
    return true;
  }

  private async isContactPaused(message: any): Promise<boolean> {
    let contact = message.key.remoteJid.replace(this.WHATSAPP_FORMAT_PHONE, "");
    const endFlowByPausedContact = this.bot.pausedContacts.some((item) => {
      return item == contact;
    });
    return endFlowByPausedContact;
  }

  private async isValidMessage(message: any): Promise<boolean> {
    if (!message.message) return false;

    if (
      message.messageStubType === WAMessageStubType.CALL_MISSED_VOICE ||
      message.messageStubType === WAMessageStubType.CALL_MISSED_VIDEO
    ) {
      return false;
    }

    if (
      message.chat === "status@broadcast" ||
      message.isGroup ||
      message.mtype === MessageType.Protocol
    ) {
      return false;
    }
    return true;
  }

  private async welcomeMessage(name: string): Promise<string> {
    const welcomeMessage = process.env.WELCOME_MESSAGE || "";
    return welcomeMessage.replace("%s", name);
  }

  private calculateDelay = async (content) => {
    try {
      const delayPerCharacter = 40;
      const characterCount = content.length; // esto a veces rompe, como que content viene vacio.
      const totalDelay = delayPerCharacter * characterCount;
      return totalDelay;
    } catch (error) {
      this.loggerService.error(error);
      return 0;
    }
  };

  private async saveConversation(lastMessage: any): Promise<void> {
    try {
      const createChatbotConversationDto = new CreateChatbotConversationDto();
      createChatbotConversationDto.chatbotId = this.bot.chatbotId;
      createChatbotConversationDto.chatId = lastMessage.chat.split("@")[0];
      createChatbotConversationDto.sender = lastMessage.sender;
      createChatbotConversationDto.messageType = lastMessage.mtype;
      createChatbotConversationDto.message = lastMessage.text;
      createChatbotConversationDto.isGroup = lastMessage.isGroup;
      createChatbotConversationDto.name = lastMessage.pushname;
      createChatbotConversationDto.ai = lastMessage.isBaileys;

      await this.chatbotConversationService.create(
        createChatbotConversationDto
      ); //TODO: PASARLO A BOTSERVICE
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async saveContact(lastMessage: any): Promise<void> {
    try {
      const client = this.bot.chatbot.actualNumber;
      const sender = lastMessage.key.remoteJid.replace(
        this.WHATSAPP_FORMAT_PHONE,
        ""
      );

      const existingContact = this.bot.contacts.find(
        (contact) => contact.sender === sender
      );

      if (existingContact) {
        if (
          existingContact.name !== lastMessage.pushName ||
          !existingContact.name
        ) {
          existingContact.name = lastMessage.pushName;
          await this.contactService.update(existingContact); //TODO: PASARLO A BOTSERVICE
        }
      } else {
        const contact = new CreateContactDto();
        contact.chatbotId = this.bot.chatbotId;
        contact.client = client;
        contact.sender = sender;
        contact.paused = false;
        contact.name = lastMessage.pushName;
        const newContact = await this.contactService.create(contact);
        this.bot.contacts.push(newContact);
      }
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async createChat(lastMessage: any): Promise<string> {
    try {
      const sender = lastMessage.key.remoteJid.replace(
        this.WHATSAPP_FORMAT_PHONE,
        ""
      );
      const createMessageAIDto = new CreateMessageAIDto();
      createMessageAIDto.chatbotId = this.bot.chatbotId;
      createMessageAIDto.sender = sender;
      createMessageAIDto.message = lastMessage.text;
      createMessageAIDto.client = this.client.decodeJid(this.client.user.id);
      const content = await this.botService.createChat(createMessageAIDto);

      //save responses
      return content;
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  private async receiveAudio(chatbotId, audioMessage): Promise<string> {
    const audioStream = await downloadContentFromMessage(audioMessage, "audio");
    const botIdFolder = `./Sessions/${chatbotId}_session`;
    const destinationFolder = botIdFolder + "/temp";
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder, { recursive: true });
    }

    const oggFilePath = destinationFolder + "/audio.ogg";
    const fileWriteStream = fs.createWriteStream(oggFilePath);

    return new Promise(async (resolve, reject) => {
      fileWriteStream.on("finish", async () => {
        const mp3FilePath = destinationFolder + "/audio.ogg";
        // await this.convertOggMp3(oggFilePath, mp3FilePath);
        const text = await this.openAIService.voiceToText(mp3FilePath);
        resolve(text);
      });

      audioStream.pipe(fileWriteStream);
    });
  }

  async convertOggMp3(inputStream, outStream) {
    const ffmpegPath = ffmpegInstaller.path;
    const ffmpeg = fluentFfmpeg();

    ffmpeg.setFfmpegPath(inputStream);

    ffmpeg
      .audioQuality(96)
      .toFormat("mp3")
      .on("error", (error: Error) => this.loggerService.error(error))
      .toFormat("mp3")
      .on("error", (error: Error) => this.loggerService.error(error))
      .pipe(outStream, { end: true });
  }

  //---------------------------------------------------------------- //

  smsg(client, message) {
    try {
      if (!message) return message;
      let M = proto.WebMessageInfo;
      if (message.key) {
        message.id = message.key.id;
        message.isBaileys =
          message.id.startsWith("BAE5") && message.id.length === 16;
        message.chat = message.key.remoteJid;
        message.fromMe = message.key.fromMe;
        message.isGroup = message.chat.endsWith("@g.us");
        message.sender = client.decodeJid(
          (message.fromMe && client.user.id) ||
            message.participant ||
            message.key.participant ||
            message.chat ||
            ""
        );
        if (message.isGroup)
          message.participant = client.decodeJid(message.key.participant) || "";
      }
      if (message.message) {
        message.mtype = getContentType(message.message);
        message.msg =
          message.mtype == "viewOnceMessage"
            ? message.message[message.mtype].message[
                getContentType(message.message[message.mtype].message)
              ]
            : message.message[message.mtype];
        message.body =
          message.message.conversation ||
          message.msg.caption ||
          message.msg.text ||
          (message.mtype == "listResponseMessage" &&
            message.msg.singleSelectReply.selectedRowId) ||
          (message.mtype == "buttonsResponseMessage" &&
            message.msg.selectedButtonId) ||
          (message.mtype == "viewOnceMessage" && message.msg.caption) ||
          message.text;
        let quoted = (message.quoted = message.msg.contextInfo
          ? message.msg.contextInfo.quotedMessage
          : null);
        message.mentionedJid = message.msg.contextInfo
          ? message.msg.contextInfo.mentionedJid
          : [];
        if (message.quoted) {
          let type = getContentType(quoted);
          message.quoted = message.quoted[type];
          if (["productMessage"].includes(type)) {
            type = getContentType(message.quoted);
            message.quoted = message.quoted[type];
          }
          if (typeof message.quoted === "string")
            message.quoted = {
              text: message.quoted,
            };
          message.quoted.mtype = type;
          message.quoted.id = message.msg.contextInfo.stanzaId;
          message.quoted.chat =
            message.msg.contextInfo.remoteJid || message.chat;
          message.quoted.isBaileys = message.quoted.id
            ? message.quoted.id.startsWith("BAE5") &&
              message.quoted.id.length === 16
            : false;
          message.quoted.sender = client.decodeJid(
            message.msg.contextInfo.participant
          );
          message.quoted.fromMe =
            message.quoted.sender === client.decodeJid(client.user.id);
          message.quoted.text =
            message.quoted.text ||
            message.quoted.caption ||
            message.quoted.conversation ||
            message.quoted.contentText ||
            message.quoted.selectedDisplayText ||
            message.quoted.title ||
            "";
          message.quoted.mentionedJid = message.msg.contextInfo
            ? message.msg.contextInfo.mentionedJid
            : [];
          message.getQuotedObj = message.getQuotedMessage = async () => {
            if (!message.quoted.id) return false;
            let q = await this.store.loadMessage(
              message.chat,
              message.quoted.id
            );
            return this.smsg(client, q);
          };
          let vM = (message.quoted.fakeObj = M.fromObject({
            key: {
              remoteJid: message.quoted.chat,
              fromMe: message.quoted.fromMe,
              id: message.quoted.id,
            },
            message: quoted,
            ...(message.isGroup ? { participant: message.quoted.sender } : {}),
          }));

          /**
           *
           * @returns
           */
          message.quoted.delete = () =>
            client.sendMessage(message.quoted.chat, { delete: vM.key });

          /**
           *
           * @param {*} jid
           * @param {*} forceForward
           * @param {*} options
           * @returns
           */
          message.quoted.copyNForward = (
            jid,
            forceForward = false,
            options = {}
          ) => client.copyNForward(jid, vM, forceForward, options);

          /**
           *
           * @returns
           */
          message.quoted.download = () =>
            client.downloadMediaMessage(message.quoted);
        }
      }
      // if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
      message.text =
        message.msg.text ||
        message.msg.caption ||
        message.message.conversation ||
        message.msg.contentText ||
        message.msg.selectedDisplayText ||
        message.msg.title ||
        "";
      /**
       * Reply to this message
       * @param {String|Object} text
       * @param {String|false} chatId
       * @param {Object} options
       */
      message.reply = (text, chatId = message.chat, options = {}) =>
        Buffer.isBuffer(text)
          ? client.sendMedia(chatId, text, "file", "", message, { ...options })
          : client.sendText(chatId, text, message, { ...options });
      /**
       * Copy this message
       */
      message.copy = () => this.smsg(client, M.fromObject(M.toObject(message)));

      /**
       *
       * @param {*} jid
       * @param {*} forceForward
       * @param {*} options
       * @returns
       */
      message.copyNForward = (
        jid = message.chat,
        forceForward = false,
        options = {}
      ) => client.copyNForward(jid, message, forceForward, options);

      return message;
    } catch (error) {
      this.loggerService.error(error);
    }
  }
}
