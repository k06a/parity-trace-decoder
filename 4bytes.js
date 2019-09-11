var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

(async function () {
    
    const batch_size = 20;
    let url = 'https://www.4byte.directory/api/v1/signatures/?format=json&page=';

    let promises = [];
    for (let i = 1; i < 1500; i++) {
        promises.push(new Promise(resolve => {
            const request = new XMLHttpRequest("");
            request.open('GET', url + i, false);
            request.send();

            if (!request.responseText.startsWith('<')) {
                const res = JSON.parse(request.responseText);

                for (let sig of res.results) {
                    console.log(`"${sig.hex_signature}":"${sig.text_signature}",`);
                }
            }

            resolve();
        }));

        if (promises.length >= batch_size) {
            await Promise.all(promises);
            promises = [];
            console.error(`Downloaded ${promises.length} pages ${i - batch_size + 1}..${i}`);
        }
    }

    await Promise.all(promises);
})();

// Need to remove last comma in array
