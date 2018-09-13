var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let nextUrl = 'https://www.4byte.directory/api/v1/signatures/?format=json&page=1';
console.log('{');
while (nextUrl) {
    const request = new XMLHttpRequest("");
    request.open('GET', nextUrl, false);
    request.send();
    const json = JSON.parse(request.responseText);

    for (let sig of json.results) {
        console.log(`"${sig.hex_signature}":"${sig.text_signature}",`);
    }
    console.error(`Downloaded page ${nextUrl}`);
    nextUrl = json.next;
}
console.log('}');

// Need to remove last comma in array
