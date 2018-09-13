const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const request = require('request');
const throttledRequest = require('throttled-request')(request);
const fs = require('fs');

throttledRequest.configure({
    requests: 1,
    milliseconds: 2100
});

function urlWithHeaders(url) {
    return {
        url: url,
        headers: {
            'Authorization': 'token ***',
            'User-Agent': '4bytes'
        }
    };
}

function urlWithHeadersWithMatches(url) {
    const options = urlWithHeaders(url);
    options.headers.Accept = 'application/vnd.github.v3.text-match+json';
    return options;
}

(async function () {
    let page = 0;
    const uniqueFunctions = {};
    while (page < 10000) {
        let json;
        await new Promise(done => throttledRequest(urlWithHeadersWithMatches(`https://api.github.com/search/code?q=function+extension:sol&page=${page}&per_page=100`), function(error, response, searchBody) {
            json = JSON.parse(searchBody);
            done();
        }));

        if (json.items == undefined) {
            console.error(json);
            await new Promise(done => setTimeout(done, 120000));
            continue;
        }

        for (let item of json.items) {
            for (let match of item.text_matches) {
                //console.log('>' + JSON.stringify(match.fragment));
                for (let micro_match of match.matches) {
                    //console.log('-' + JSON.stringify(micro_match));
                    const from = micro_match.indices[0];
                    const to = match.fragment.indexOf(')', from);
                    if (to != -1) {
                        const text = match.fragment.substr(from + 8, match.fragment.indexOf(')', from) - from + 1 - 8).trim();
                        if (text.match(/^[0-9a-zA-Z_]+\(([0-9a-zA-Z_\[\]]+\s+[0-9a-zA-Z_]+,\s*)*\s*([0-9a-zA-Z_\[\]]+\s+[0-9a-zA-Z_]+)?\s*\)$/)) {
                            const fun = text.replace(/\s*([0-9a-zA-Z\[\]]+)\s+[0-9a-zA-Z_]+\s*/g, '$1');
                            const tokens = fun.split(/[,\(\)]/);
                            const res = tokens[0] + '(' + tokens.slice(1, -1).map(t => {
                                if (t.length != 0 &&
                                    !t.startsWith('int') && !t.startsWith('uint') &&
                                    !t.startsWith('address') && !t.startsWith('byte') &&
                                    !t.startsWith('string') && !t.startsWith('bool'))
                                {
                                    return 'address';
                                }
                                return t;
                            }).join(',') + ')';

                            if (!uniqueFunctions[res]) {
                                uniqueFunctions[res] = true;
                                console.log(res);
                            }
                        }
                    }
                }
            }
        }

        console.error(`Downloaded page ${page}`);
        page += 1;
    }
})();
