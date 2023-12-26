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


// Función para extraer el valor de una clave desde el texto
function extractValueByKey(text, key) {
  // Utilizar una expresión regular para buscar la clave y su valor
  const regex = new RegExp(`${key}\\s*:\\s*([^,\\s]+)`);
  const match = text.match(regex);

  // Si se encuentra una coincidencia, devolver el valor encontrado
  if (match && match[1]) {
      return match[1];
  }

  // Si no se encuentra la clave o no hay valor asociado, devolver null
  return null;
}
const extractAgentProperties = (text) => {
  try {
      const properties = text.match(/(\w+)\s*:\s*("([^"]*)"|([^,]*))/g);
      if (!properties) {
          return null;
      }

      const agentProperties = {};
      properties.forEach(property => {
          const [keyWithQuotes, valueWithQuotes] = property.split(/\s*:\s*/);
          const key = keyWithQuotes.replace(/"/g, '');
          const cleanedValue = valueWithQuotes.replace(/^"(.*)"$/, '$1');

          // Verificar si el valor es numérico y ajustar el tipo
          if (['temperature', 'topk', 'maxTokens'].includes(key)) {
              const numericValue = parseFloat(cleanedValue);

              if (isNaN(numericValue)) {
                  throw new Error(`Invalid value for ${key}. Must be a number.`);
              }

              // Validar rango para 'temperature'
              if (key === 'temperature' && (numericValue < 0 || numericValue > 1)) {
                  throw new Error(`Invalid value for ${key}. Must be between 0 and 1.`);
              }

              agentProperties[key] = numericValue;
          } else {
              // Si no es un número, mantener el valor como cadena
              agentProperties[key] = cleanedValue;
          }
      });

      return agentProperties;
  } catch (error) {
      throw new Error(`Error extracting agent properties: ${error.message}`);
  }
};
const updateJsonAgents = async ( sender, agentId, nameChatbot) => {

  try {
    
    let agents = await readJsonAgents(nameChatbot);
    // Si es el primer mensaje del remitente, crea un nuevo array para el remitente
    
      agents[sender] = agentId;
      console.log("agents",agents)

    // Escribe el objeto JSON en un archivo
    fs.writeFileSync(
      `Data/Agents/${nameChatbot}.json`,
      JSON.stringify(agents),
      "utf-8"
    );
  } catch (error) {
    console.error("Ha ocurrido un error en execute:", error);
  }
};
const readJsonAgents = async (nameChatbot) => {
  try {
    const data = fs.readFileSync(
      `Data/Agents/${nameChatbot}.json`,
      "utf-8"
    );
    console.log("data",JSON.parse(data))
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};





module.exports = {
  updateChatMemory,
  readChatMemoryFromFile,
  extractValueByKey,
  extractAgentProperties,
  updateJsonAgents,
  readJsonAgents,
  
};
