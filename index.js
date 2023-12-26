require("dotenv").config();
const PORT = process.env.PORT;
const IP_ADDRESS = process.env.IP_ADDRESS;
const nameChatbot = process.env.CODE_GPT_API_KEY
const http = require("http");
const { app } = require("./app");
const { instanciasBot } = require("./instances.js");
const fs = require("fs").promises;
const { join } = require("path");
const whatsAppBot = require("./chatbot.js");

const getCreds = async (sessionName) => {
  const filePath = join(
    process.cwd(),
    `/Sessions/${sessionName}_session/creds.json`
  );

  try {
    const data = await fs.readFile(filePath, "utf8");
    const creds = JSON.parse(data);
    const num = creds.me.id;

    if (num) {
      return `${num.split(":")[0]}@s.whatsapp.net`;
    }
  } catch (err) {
    console.log("No hay credencial, crear bot nuevo");
  }
};

const createBots = async () => {

  try {
    const chatbotsData =[{chatbotId: nameChatbot}];
    const botCreationPromises = [];

    for (const data of chatbotsData) {
      const chatbotId = data.chatbotId;
      const creds = await getCreds(chatbotId);

      // Crear una promesa para la creación del bot
      const botCreationPromise = (async () => {
        if (creds) {
          // Bot conectado
          const botInstance = new whatsAppBot(chatbotId, creds);
          instanciasBot[chatbotId] = botInstance;
        } else {
          // Bot desconectado
          const botInstance = new whatsAppBot(chatbotId);
          instanciasBot[chatbotId] = botInstance;
        }
      })();

      botCreationPromises.push(botCreationPromise);
    }

    // Esperar a que todas las promesas de creación de bots se completen
    await Promise.all(botCreationPromises);

  } catch (e) {
    console.log("Error al obtener y crear los bots", e);
  }
};




const server = http.createServer(app);
createBots()

  server.listen(PORT, IP_ADDRESS, () => {
    console.log(`Listening on http://${IP_ADDRESS}:${PORT}`);
  });