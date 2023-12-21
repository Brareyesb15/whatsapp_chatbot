const { headers, generalUrl } = require("./ia");
const {  extractValueByKey } = require("./utils");
const zlib = require('zlib');




const commands = async (msg,command) => {
const method = methods[command[0]];
const response = await method(msg)

if (response) return response
return false
}


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


// async function decodeResponse(response) {
//     try {
//       // Descomprimir el cuerpo si está comprimido con Brotli
//       const contentEncoding = response.headers.get('content-encoding');
//       console.log("contentencoding", contentEncoding)
//       let responseBody;
  
//       if (contentEncoding && contentEncoding.toLowerCase() === 'br') {
//         const compressedBody = await response.arrayBuffer();
//         console.log("compressed", compressedBody)
//         const decompressedBody = zlib.brotliDecompressSync(compressedBody);

//         console.log("decompressed", decompressedBody)
//         responseBody = decompressedBody.toString('utf-8');
//       } else {
//         // Si no está comprimido, simplemente lee el cuerpo como texto
//         responseBody = await response.text();
//       }
  
//       return responseBody;
//     } catch (error) {
//       throw error;
//     }
//   }

const methods = {
    "/createAgent" :  createAgent,
    // "/getAgent" : getAgent,
    // "/listAgents" : listAgents,
    // "/updateAgent"  : updateAgent,
    // "/deleteAgent" :  deleteAgent,
    // "/usersMe" : usersMe,
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