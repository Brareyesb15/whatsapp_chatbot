const { headers, generalUrl } = require("./ia");
const { methods, extractValueByKey } = require("./utils");

const commands = async (msg,command) => {
const method = methods[command];
const response = method(msg)
if (response) return response
return false
}


const createAgent = async (msg) => {
    try {
        // Obtener el valor asociado con la clave 'nameAgent' desde el texto
        const nameValue = extractValueByKey(msg.text, 'nameAgent');

        // Verificar si se encontró un valor para 'nameAgent'
        if (nameValue !== null) {
            // Crear el objeto payload con el nombre del agente
            const payload = { "name": nameValue };

            // Realizar la solicitud con el payload actualizado
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload),
            });

            return response

        } else {
            // Manejar el caso en el que 'nameAgent' no se encontró o no tiene un valor asociado
            return "'nameAgent' no se encontró o no tiene un valor asociado.";
        }
    } catch (error) {
        return error.message;
    }
}


module.exports = {
    commands
}