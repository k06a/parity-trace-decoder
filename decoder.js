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

        const value = new BigNumber(tree.trace.action.value.substr(2), 16);
        const methodId = tree.trace.action.input.substr(0,10);
        const method = methods[methodId] || methodId;

        let methodStr = method + '(0x' + (tree.trace.action.input || '').substr(10) + ')';
        if (method.endsWith(')')) {
            const input = (tree.trace.action.input || '').substr(10);
            const methodName = method.split('(')[0];
            const inTypes = method.split(/[(),]+/).slice(1, -1);

            var inDecoded = abi.rawDecode(inTypes, Buffer.from(input, 'hex'))
            methodStr = methodName + '(' + inTypes.map((type, i) => printArg(type, inDecoded[i])) + ')';
        }
        if (tree.trace.result && tree.trace.result.output) {
            const shortResult = tree.trace.result.output.replace(/0x0+/, '0x');
            methodStr += ':' + (shortResult == '0x' ? '0x0' : shortResult);
        }
        var result = tab + error + ` [${index++}] ` + methodStr + (value.isZero() ? '' : ` // => ${Number.parseInt(value.toString())/10**18} ETH`);
        result += ' { to: ' + tree.trace.action.to +  ' }'
        for (let leaf of Object.keys(tree)) {
            if (leaf != 'trace') {
                let str;
                [str, index] = recursivePrint(tree[leaf], index, tab + '  ');
                result += '\n' + str;
            }
        }

        return [result, index];
    }

    return recursivePrint(tree)[0];
};

module.exports = decoder;
