import { Boom } from "@hapi/boom";

import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidDecode,
  proto,
  getContentType,
  delay,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";

const MAIN_LOGGER = require("@whiskeysockets/baileys/lib/Utils/logger").default;

import { Bot } from "../../chatbots/entities/bot.entity";
import { Injectable } from "@nestjs/common";
import * as fs from "fs-extra";
import { MessageType } from "../../chatbots/enums/message-type.enum";

@Injectable()
export class WhatsappGateway {
  constructor(
  ) {
  }
  private store: any;
  private bot: Bot;
  public client: any;
  private messageQueues = {};
  private messageKeyQueues: any[] = [];
  private WHATSAPP_FORMAT_PHONE = "@s.whatsapp.net";
  private TIME_TO_WAIT: number = 25000


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

        printQRInTerminal: true,
        browser: ["Powered by codeGPT with <3"],
        auth: state,
      });

      this.client.public = true;


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
          console.log(error)
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


          if (message.isBaileys) {
            return;
          }

          const allowedMessageTypeToProcess = [
            MessageType.Text,
            MessageType.Chat,
            MessageType.Audio,
          ];

          if (message.fromMe) {
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
              const content = // ACÁ VA EL LLAMADO A LA FUNCIÓN QUE INTERACTUA CON LA IA. 

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
                //   if (
                //     this.bot.chatbot.connectionState !== ConnectionStatus.Active
                //   )
                //     return;
                //   const fetchStatus = await this.client.fetchStatus(
                //     message.key.remoteJid
                //   );
                  message.reply(content);
                } catch (error) {
                  console.log(error)
                }
              }, resDelay);
            }
          }, this.TIME_TO_WAIT);
        } catch (error) {
          console.log(error);
        }
      });

      this.client.ev.on("connection.update", async (update) => {
        try {
          const { connection } = update;
          const fn =
            this.connectionMap[connection] || this.connectionMap["default"];
          fn(update);
        } catch (error) {
          console.log(error);
        }
      });

      this.client.ev.on("creds.update", saveCreds);

      //Para enviar mensajes recibe numero@ws y texto
      this.client.sendText = (jid, text, quoted = "", options) =>
        this.client.sendMessage(jid, { text: text });
    } catch (error) {
        console.log(error);
    }
  }

  private async openConnection(parameters: any): Promise<void> {
    try {
      this.bot.qr = null;
      this.bot.connectionState = true;
      const botNumber = this.client
        .decodeJid(this.client.user.id)
        .replace(this.WHATSAPP_FORMAT_PHONE, "");
      }
      catch(error){
        console.log(error)
      }
  }

  private async closeConnection(parameters: any): Promise<void> {
    try {
      const { lastDisconnect } = parameters;
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        const folderToDelete = `./Sessions/${this.bot.chatbotId}`;
        fs.remove(folderToDelete)
          .then(() => {})
          .catch((error) => {});
      } else {
      }
      this.start();
    } catch (error) {
        console.log(error)
      this.start();
    }
  }

  private async defaultConnection(parameters: any): Promise<void> {
    try {
      const { qr } = parameters;
      if (qr) {
        this.bot.qr = qr;
      }
    } catch (error) {
        console.log(error)
    }
}


  private calculateDelay = async (content) => {
    try {
      const delayPerCharacter = 40;
      const characterCount = content.length; // esto a veces rompe, como que content viene vacio.
      const totalDelay = delayPerCharacter * characterCount;
      return totalDelay;
    } catch (error) {
      console.log(error)
      return 0;
    }
  };

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
