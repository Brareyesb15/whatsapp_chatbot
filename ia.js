

const generalUrl = "https://api.codegpt.co/v1";


const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.CODE_GPT_API_KEY}`
};

async function completion(message) {
    try {
        const url = `${generalUrl}${"/completion"}`
    
        const payload = {
            "agent": "24343423",
            "messages": [
                {
                    "role": "user",
                    "content": `${message}`
                }
            ],
            "stream": False
        }

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(data);

    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports({
    completion
})

