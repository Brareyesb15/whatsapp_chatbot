

const url = "https://api.codegpt.co/v1/completion";


const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.CODE_GPT_API_KEY}`
};

async function postData() {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers
        });

        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

postData();

