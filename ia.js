const { noAgent } = require("./apiCalling");
const { readChatMemoryFromFile, updateChatMemory, readJsonAgents } = require("./utils");
const nameChatbot = process.env.CODE_GPT_API_KEY

const generalUrl = process.env.GENERAL_URL_API



const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.CODE_GPT_API_KEY}`
};

const completion = async (message) => {
    const chatHistory = await readChatMemoryFromFile(nameChatbot);
    const number = message.sender.split("@")[0];
    let agents= await readJsonAgents(nameChatbot)
    console.log("agents",agents)
    let agent = agents[number]
    
    if (!agent){
      return await noAgent()
    }
    
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
        agent: agent,
        messages: messages,
        stream: false,
      };
  
      console.log("payload",JSON.stringify(payload));
  
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      console.log("response", response)
  
      const data = await response.json();
      const text = data.replace(/^data: /, "");
      
      // Actualiza el historial del chat con la respuesta recibida
      updateChatMemory(number, { role: "assistant", content: text }, nameChatbot);
      console.log("text", text)
      return text ; // Devuelve un objeto con la propiedad "text"
    } catch (error) {
      console.error("Error:", error);
      return { error: error.message }; // Devuelve un objeto con la propiedad "error"
    }
  };

  const selectAgent = async () => {


  }
  

module.exports = {
    completion,
    generalUrl,
    headers
  };
