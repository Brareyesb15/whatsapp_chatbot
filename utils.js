const fs = require("fs");

const updateChatMemory = async ( sender, message, nameChatbot) => {
  console.log("updateChat", sender,message,nameChatbot)
  try {
    let chatHistory = await readChatMemoryFromFile(nameChatbot);
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

    console.log(nameChatbot);
    // Escribe el objeto JSON en un archivo
    fs.writeFileSync(
      `Data/Memory/${nameChatbot}.json`,
      chatHistoryJSON,
      "utf-8"
    );
  } catch (error) {
    console.error("Ha ocurrido un error en execute:", error);
  }
};

// Función de utilidad para leer el historial de chat desde un archivo
const readChatMemoryFromFile = async (nameChatbot) => {
  try {
    const data = fs.readFileSync(
      `Data/Memory/${nameChatbot}.json`,
      "utf-8"
    );
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

const methods = {
  "/createAgent" :  createAgent,
  "/getAgent" : getAgent,
  "/listAgents" : listAgents,
  "/updateAgent"  : updateAgent,
  "/deleteAgent" :  deleteAgent,
  "/usersMe" : usersMe,
  "/loadDocuments" : loadDocuments,
  "/trainDocuments": trainDocuments,
  "/loadTrainDocuments" : loadTrainDocuments,
  "/listDocuments" :  listDocuments,
  "/getDocument" : getdocument,
  "/deleteDocument" : deleteDocument
}



module.exports = {
  updateChatMemory,
  readChatMemoryFromFile,
};
