const BigNumber = require('bn.js');
const abi = require('ethereumjs-abi');

decoder = function (traces, methods) {
    const tree = {};
    for (let trace of traces) {
        let subtree = tree;
        for (let index of trace.traceAddress) {
            if (!subtree[index]) {
                subtree[index] = {};
            }
            subtree = subtree[index];
        }

        subtree.trace = trace;
    }

    function printArg(type, value) {
        if (type.startsWith('int') || type.startsWith('uint') || type == 'address') {
            return '(' + type + ')(0x' + value.toString(16) + ')';
        }
        if (type.startsWith('bytes')) {
            return '(' + type + ')(0x' + value.toString('hex') + ')';
        }
        if (type.startsWith('string')) {
            return '(' + type + ')("' + value.toString() + '")';
        }
        return '(' + type + ')(' + value + ')';
    }

    function recursivePrint(tree, index = 1, tab = '') {
        const error = function () {
            if (tree.trace.error == 'Reverted') {
                return '*';
            }
            if (tree.trace.error == 'Bad instruction') {
                return '#';
            }
            if (tree.trace.error == 'Out of gas') {
                return '$';
            }
            return ' ';
        }();

        let value = new BigNumber((tree.trace.action.value || '').substr(2), 16);
        if (tree.trace.type == 'suicide') {
            value = new BigNumber(tree.trace.action.balance.substr(2), 16);
        }
        const methodId = (tree.trace.action.input || '').substr(0,10);
        const method = (methods || {})[methodId] || methodId;

        let methodStr = method + '(0x' + (tree.trace.action.input || '').substr(10) + ')';
        let parsedArguments = [];
        if (method.endsWith(')')) {
            const input = (tree.trace.action.input || '').substr(10);
            const methodName = method.split('(')[0];

            let inTypes;
            if (method.indexOf('(') == method.lastIndexOf('(')) {

                inTypes = method.split(/[(),]+/).slice(1, -1);
            } else {

                inTypes = [];
                let iter = inTypes;
                const backs = [];
                for (let letter of method.substr(method.indexOf('(') + 1)) {
                    if (letter == '(') {
                        iter.push([]);
                        backs.push(iter);
                        iter = iter[iter.length - 1];
                    } else
                    if (letter == ')') {
                        iter = backs.pop();
                    } else
                    if (letter == ',') {
                        iter.push("");
                    } else {
                        if (iter.length == 0 || typeof(iter[iter.length - 1]) != 'string') {
                            iter.push("");
                        }
                        iter[iter.length - 1] = iter[iter.length - 1] + letter;
                    }
                }
            }

            let inDecoded;
            try {
                inDecoded = abi.rawDecode(inTypes, Buffer.from(input, 'hex'));
                parsedArguments = inTypes.map((type, i) => printArg(type, inDecoded[i]));
                methodStr = methodName + '(' + parsedArguments + ')';
            } catch(e) {
            }
        }

        let shortResult = '0x';
        if (tree.trace.result && tree.trace.result.output) {
            shortResult = tree.trace.result.output.replace(/0x0+/, '0x');
            methodStr += ':' + (shortResult == '0x' ? '0x0' : shortResult);
        }

        var result = (tab.length == 0 ? '<table border="1" bordercolor="#eee" style="width: 100%;">' +
            ['Err', '#', 'Tree', 'To', 'Value', 'Gas'].map(a => `<th class="text-center">${a}</th>`).join('') +
            '<colgroup><col width="0%"/><col width="0%"/><col width="100%"/><col width="0%"/><col width="0%"/><col width="0%"/><col width="0%"/></colgroup>' : '') + '<tr>';
        
        const prefix = tab.split('').map(x => '&nbsp;').join('');

        result +=
            `<td style="white-space: nowrap;">${error}</td>` +
            `<td style="white-space: nowrap;">[${index++}]</td>` +
            `<td style="white-space: nowrap; text-overflow:ellipsis; overflow: hidden; max-width:1px;">` +
                '<ul class=tree><li>' + prefix + (tree.trace.type == 'suicide' ? `selfdestruct(${tree.trace.action.to || tree.trace.action.refundAddress})` : methodStr) +
                '<div class="expander"></div><ul>' +
                `<li>${prefix}[ARGUMENTS]:</li>` +
                parsedArguments.map(a => '<li>&nbsp;&nbsp;' + prefix + a + '</li>').join('') +
                (shortResult.length == '0x' ? '' : `<li>${prefix}[RETURN]:</li><li>&nbsp;&nbsp;${prefix + shortResult}</li>`) +
                '</ul></li></ul>' +
            `</td>` +
            `<td style="white-space: nowrap;">&nbsp;${tree.trace.action.to || tree.trace.action.refundAddress}&nbsp;</td>` +
            `<td style="white-space: nowrap; text-align:right;">&nbsp;` + (value.isZero() ? '0' : Number.parseInt(value.toString())/10**18) + ` ETH&nbsp;</td>` +
            `<td style="white-space: nowrap;">&nbsp;` + ((tree.trace.result && tree.trace.result.gasUsed) ? parseInt(tree.trace.result.gasUsed.substr(2), 16) + 700 : '') + `&nbsp;</td>`;

        if (Object.keys(tree).length > 0) {
            let anyLeaf = false;
            for (let leaf of Object.keys(tree)) {
                if (leaf != 'trace') {
                    let str;
                    [str, index] = recursivePrint(tree[leaf], index, tab + '    ');
                    result += str;
                }
            }
        }
        result += '</tr>' + (tab.length == 0 ? '</table>' : '');

        return [result, index];
    }

    return recursivePrint(tree)[0];// + '\n';
};

module.exports = decoder;
