const fs = require("fs");

const updateChatMemory = async ( sender, message, chatbotId) => {
  try {
    let chatHistory = await readChatMemoryFromFile(chatbotId);
    // Si es el primer mensaje del remitente, crea un nuevo array para el remitente
    if (!chatHistory[sender]) {
      chatHistory[sender] = [];
    }

    // Agrega el mensaje al historial de chat del remitente
    chatHistory[sender].push(message);

    // Si el historial de chat supera la longitud máxima de 20 mensajes, elimina el mensaje más antiguo
    if (chatHistory[sender].length > 30) {
      chatHistory[sender].shift();
    }

    // Convierte el objeto chatHistory a JSON
    const chatHistoryJSON = JSON.stringify(chatHistory, null, 2);

    console.log(chatbotId);
    // Escribe el objeto JSON en un archivo
    fs.writeFileSync(
      `Data/Memory/${chatbotId}_chatMemory_gpt.json`,
      chatHistoryJSON,
      "utf-8"
    );
  } catch (error) {
    console.error("Ha ocurrido un error en execute:", error);
  }
};

// Función de utilidad para leer el historial de chat desde un archivo
const readChatMemoryFromFile = async (chatbotId) => {
  try {
    const data = fs.readFileSync(
      `Data/Memory/${chatbotId}_chatMemory_gpt.json`,
      "utf-8"
    );
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};



module.exports = {
  updateChatMemory,
  readChatMemoryFromFile,
};
