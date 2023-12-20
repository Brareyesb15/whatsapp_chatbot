

const generalUrl = "https://api.codegpt.co/v1";


const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.CODE_GPT_API_KEY}`
};

const completion = async (message)=> {
    console.log("in completion", message)
    try {
        const url = `${generalUrl}${"/completion"}`
    
        const payload = {
            "agent": "3697e58d-422a-499c-9bba-e70016429c43",
            "messages": [
                {
                    "role": "user",
                    "content": `${message}`
                }
            ],
            "stream": false
        }

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data.replace(/^data: /, '');

    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = {
    completion
  };
