const { headers, generalUrl } = require("./ia");
const {  extractValueByKey, extractAgentProperties } = require("./utils");




const commands = async (msg, command) => {
    try {
        const response = await methods[command[0]](msg);
        return response || false;
    } catch (error) {
        return `Error: Unidentified method`;
    }
};



const createAgent = async (msg) => {
    try {
        const url = `${generalUrl}/agent`;
        // Get the value associated with the 'nameAgent' key from the text
        const nameValue = extractValueByKey(msg.text, 'nameAgent');

        // Check if a value was found for 'nameAgent'
        if (nameValue !== null) {
            // Create the payload object with the agent's name
            const payload = { "name": nameValue };

            // Make the request with the updated payload
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload),
            });

            const jsonResponse = await response.json();

            return `Agent created: ${JSON.stringify(jsonResponse, null, 2)}`;
        } else {
            // Handle the case where 'nameAgent' was not found or does not have an associated value
            return "'nameAgent' not found or does not have an associated value.";
        }
    } catch (error) {
        return error.message;
    }
};

const getAgent = async (msg) => {
    try {
        
        // Get the value associated with the 'nameAgent' key from the text
        const nameValue = extractValueByKey(msg.text, `agentId`);

        if (nameValue !== null) {
            // Create the payload object with the agent's id
            
            const url = `${generalUrl}/agent/${nameValue}`;
            // Make the request 
            const response = await fetch(url, {
                method: "GET",
                headers: headers
            });

            const jsonResponse = await response.json();

            return `Agent: ${JSON.stringify(jsonResponse, null, 2)}`;

        } else {
            // Handle the case where 'nameAgent' was not found or does not have an associated value
            return "'agentId' not found or does not have an associated value.";
        }
}catch(error){
    return error.message;
}
}

const listAgents = async () => {
    try {
            const url = `${generalUrl}/agent`;
            // Make the request with the updated payload
            const response = await fetch(url, {
                method: "GET",
                headers: headers
            });

            const jsonResponse = await response.json();

            return `Agents: ${JSON.stringify(jsonResponse, null, 2)}`;

    }catch(error){
        return error.message;
}
}

const updateAgent = async (msg) => {
    try {
        const payload = extractAgentProperties(msg.text);
        
        if (payload) {
            // Extracted properties successfully
            const agentId = payload.agentId;
            const url = `${generalUrl}/agent/${agentId}`;

            console.log("Payload", payload)
            
            // Make the request
            const response = await fetch(url, {
                method: "PATCH",
                headers: headers,
                body : JSON.stringify(payload)

            });

            console.log("response", response)

            const jsonResponse = await response.json();

            return `Agent: ${JSON.stringify(jsonResponse, null, 2)}`;
        } else {
            return "No agent properties found in the message.";
        }
    } catch (error) {
        return error.message;
    }
};

const deleteAgent = async (msg) => {
    try {
        
        // Get the value associated with the 'nameAgent' key from the text
        const nameValue = extractValueByKey(msg.text, `agentId`);

        if (nameValue !== null) {
            // Create the payload object with the agent's id
            
            const url = `${generalUrl}/agent/${nameValue}`;
            // Make the request 
            const response = await fetch(url, {
                method: "DELETE",
                headers: headers
            });

            const jsonResponse = await response.json();

            return `Agent deleted: ${JSON.stringify(jsonResponse, null, 2)}`;

        } else {
            // Handle the case where 'nameAgent' was not found or does not have an associated value
            return "'agentId' not found or does not have an associated value.";
        }
}catch(error){
    return error.message;
}
}

const usersMe = async (msg) => {
    try {
     
            const url = `${generalUrl}/users/me`;
            // Make the request 
            const response = await fetch(url, {
                method: "GET",
                headers: headers
            });

            const jsonResponse = await response.json();

            return `User info: ${JSON.stringify(jsonResponse, null, 2)}`; 
}catch(error){
    return error.message;
}
}

const methods = {
    "/createAgent" :  createAgent,
    "/getAgent" : getAgent,
    "/listAgents" : listAgents,
    "/updateAgent"  : updateAgent,
    "/deleteAgent" :  deleteAgent,
    "/usersMe" : usersMe,
    // "/loadDocuments" : loadDocuments,
    // "/trainDocuments": trainDocuments,
    // "/loadTrainDocuments" : loadTrainDocuments,
    // "/listDocuments" :  listDocuments,
    // "/getDocument" : getdocument,
    // "/deleteDocument" : deleteDocument
  }


module.exports = {
    commands,
    createAgent
}