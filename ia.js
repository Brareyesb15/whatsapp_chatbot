const { readChatMemoryFromFile, updateChatMemory } = require("./utils");
const nameChatbot = process.env.CHATBOT_NAME



const generalUrl = "https://api.codegpt.co/v1";


const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.CODE_GPT_API_KEY}`
};

const completion = async (message) => {
    const chatHistory = await readChatMemoryFromFile(nameChatbot);
    const number = message.sender.split("@")[0];
  
    updateChatMemory(
        number,
        { role: "user", content: message.text },
        nameChatbot
      );
  
    // Verifica si hay historial para el remitente y crea un array de mensajes
    let messages =
      chatHistory[number]?.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];
  
    console.log("messages", messages);
  
    // Agrega el nuevo mensaje del usuario al final del array
    messages.push({
      role: "user",
      content: message.text,
    });
  
    try {
      const url = `${generalUrl}${"/completion"}`;
  
      const payload = {
        agent: "3697e58d-422a-499c-9bba-e70016429c43",
        messages: messages,
        stream: false,
      };
  
      console.log(payload);
  
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
      const text = data.replace(/^data: /, "");
      
      // Actualiza el historial del chat con la respuesta recibida
      updateChatMemory(number, { role: "assistant", content: text }, nameChatbot);
  
      return text ; // Devuelve un objeto con la propiedad "text"
    } catch (error) {
      console.error("Error:", error);
      return { error: error.message }; // Devuelve un objeto con la propiedad "error"
    }
  };
  

module.exports = {
    completion
  };
