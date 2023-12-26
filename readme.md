**_WhatsApp Chatbot with codeGPT API Integration_**

This repository contains the source code for a chatbot application built using GPT (Generative Pre-trained Transformer) technology. The chatbot interacts with users through a messaging interface, processing commands, and performing various actions based on the provided input.

**_Install Dependencies:_**

Before running the application, install the required dependencies by executing:

npm install

### Setup

**_Environment Variables:_**

Ensure you have the necessary environment variables set, including CODE_GPT_API_KEY and GENERAL_URL_API. These are essential for authenticating and communicating with the API.

**_Integration with WhatsApp:_**

We use the Baileys library to create a chatbot using WhatsApp. Baileys generates a chatbot with the API key you provide in the .env file as the identifier. If you want to create a different chatbot using a different account, change the CODE_GPT_API_KEY in the .env file to create a new chatbot associated with your new codeGPT account. You can create your codeGPT account [here](https://www.codegpt.co).

Once your chatbot is associated with your codeGPT account, start the server using `npm start` to initiate the service. Your chatbot will be launched, generating a QR code that you can scan using the option in the WhatsApp application on your mobile phone (similar to scanning for WhatsApp Web).

Once the QR code is scanned, your chatbot will be associated with that WhatsApp number. Any message sent to that WhatsApp number will be received and responded to by your chatbot (excluding messages from groups).

### Usage

The chatbot has two functionalities:

If you send a message without commands, it will be interpreted as part of the conversation flow. In other words, you can interact through messages with your chatbot associated with the codeGPT account and the default agent. If the phone number sending the message writes to the chatbot for the first time, it will prompt you to choose an agent to interact with, considering the available agents through the `/defaultAgent` command. Once the agent is selected, you can interact with them through messages. If you want to change the agent, you can use the same command by sending the agentId, which you can obtain from the list of agents using the `/listAgents` command.

The second functionality is to interact with your codeGPT account using commands. This allows you to configure your agents and documents through a list of commands that will be explained later:

- "/createAgent"
- "/getAgent"
- "/listAgents"
- "/updateAgent"
- "/deleteAgent"
- "/usersMe"
- "/loadDocuments"
- "/trainDocuments"
- "/loadTrainDocuments"
- "/listDocuments"
- "/getDocument"
- "/deleteDocument"
- "/defaultAgent"
- "/myAgent"

The chatbot responds to commands provided in the form of messages. Each command starts with a forward slash (/) followed by the specific command name.

If you do not provide a command, the message will be interpreted as a conversation flow question for your chatbot using codeGPT. It will respond to your message considering the history (maximum 30 messages).

Here are some of the available commands:

**_Available Commands:_**

**Create Agent:**

- `/createAgent`: Create a new agent with a specified name.

  Example: `/createAgent nameAgent: Agent1`

  **Method Used:**

  - **Method Name:** `createAgent`
  - **Functionality:**
    - Extracts the agent name from the message using `extractValueByKey`.
    - Sends a request to create the agent with the specified name.
    - Returns the result of the agent creation.

**Get Agent Information:**

- `/getAgent`: Retrieve information about a specific agent by providing its ID.

  Example: `/getAgent agentId:123`

  **Method Used:**

  - **Method Name:** `getAgent`
  - **Functionality:**
    - Extracts the agent ID from the message using `extractValueByKey`.
    - Sends a request to retrieve information about the specified agent.
    - Returns the result of the agent information retrieval.

**List Agents:**

- `/listAgents`: List all agents currently available.

  Example: `/listAgents`

  **Method Used:**

  - **Method Name:** `listAgents`
  - **Functionality:** - Sends a request to retrieve a list of all available agents. - Returns the result of the agent list.
    **Update Agent:**

- `/updateAgent`: Update properties of a specific agent.

  Example: `/updateAgent agentId:123, property1:value1,property2:value2`

  _Importante: separa por comas las propiedades a cambiar y solo los valores que quieras cambiar._

  **Method Used:**

  - **Method Name:** `updateAgent`
  - **Functionality:**
    - Extracts agent properties from the message using `extractAgentProperties`.
    - Sends a request to update the specified agent with the extracted properties.
    - Returns the result of the agent update.

**Delete Agent:**

- `/deleteAgent`: Delete a specific agent by providing its ID.

  Example: `/deleteAgent agentId: 123`

  **Method Used:**

  - **Method Name:** `deleteAgent`
  - **Functionality:**
    - Extracts the agent ID from the message using `extractValueByKey`.
    - Sends a request to delete the specified agent.
    - Returns the result of the agent deletion.

**User Information:**

- `/usersMe`: Get information about the current user.

  Example: `/usersMe`

  **Method Used:**

  - **Method Name:** `usersMe`
  - **Functionality:**
    - Sends a request to retrieve information about the current user.
    - Returns the result of the user information retrieval.

**Load Document:**

- `/loadDocuments`: Load a document for processing.

  Example: `/loadDocuments documentName.pdf`

  **Method Used:**

  - **Method Name:** `loadDocuments`
  - **Functionality:**
    - Recibe un documento y el comando `/loadDocuments` como caption.
    - Sends a request to load the document for processing.
    - Returns the result of the document loading process.

**Train Document:**

- `/trainDocuments`: Train a document specified by its ID.

  Example: `/trainDocuments documentId: 456`

  _Recibe un id de documento para entrenar ese documento. Puedes obtener los documentos no entrenados a través de `/listDocument`._

  **Method Used:**

  - **Method Name:** `trainDocuments`
  - **Functionality:**
    - Extracts the document ID from the message using `extractValueByKey`.
    - Sends a request to train the specified document.
    - Returns the result of the document training process.

**Load and Train Document:**

- `/loadTrainDocuments`: Load and train a document for processing.

  Example: `/loadTrainDocuments documentName.pdf`

  **Method Used:**

  - **Method Name:** `loadTrainDocuments`
  - **Functionality:**
    - Permite cargar y entrenar el documento al mismo tiempo.
    - Reads the content of the specified document file.
    - Creates a Blob and FormData objects.
    - Sends a request to load and train the document.
    - Returns the result of the document loading and training process.

**List Documents:**

- `/listDocuments`: List all documents available to the user.

  Example: `/listDocuments`

  **Method Used:**

  - **Method Name:** `listDocuments`
  - **Functionality:**
    - Sends a request to retrieve a list of all available documents for the user.
    - Returns the result of the document list.

**Get Document Information:**

- `/getDocument`: Get information about a specific document by providing its ID.

  Example: `/getDocument documentId: 456`

  **Method Used:**

  - **Method Name:** `getDocument`
  - **Functionality:**
    - Extracts the document ID from the message using `extractValueByKey`.
    - Sends a request to retrieve information about the specified document.
    - Returns the result of the document information retrieval.

**Delete Document:**

- `/deleteDocument`: Delete a specific document by providing its ID.

  Example: `/deleteDocument documentId: 456`

  **Method Used:**

  - **Method Name:** `deleteDocument`
  - **Functionality:**
    - Extracts the document ID from the message using `extractValueByKey`.
    - Sends a request to delete the specified document.
    - Returns the result of the document deletion.

**Set Default Agent:**

- `/defaultAgent`: Set a default agent for the chatbot.

  Example: `/defaultAgent agentId:123`

  **Method Used:**

  - **Method Name:** `defaultAgent`
  - **Functionality:**
    - Extracts the agent ID from the message using `extractValueByKey`.
    - Updates the default agent for the current user.
    - Returns a confirmation message.

**Get Current Agent:**

- `/myAgent`: Get information about the current agent associated with the chatbot.

  Example: `/myAgent`

  **Method Used:**

  - **Method Name:** `myAgent`
  - **Functionality:**
    - Retrieves information about the current agent associated with the chatbot.
    - Returns the result of the agent information retrieval.

**How it Works:**

- The chatbot processes incoming messages and identifies commands using the `/` prefix.
- Commands are mapped to specific methods that execute the corresponding functionality.
- Methods interact with the GPT API, process data, and return informative responses.
