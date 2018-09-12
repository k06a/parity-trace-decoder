const BigNumber = require('bn.js');

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

        var result = tab + error + ` [${index++}] ` + method + (value.isZero() ? '' : ` // => ${Number.parseInt(value.toString())/10**18} ETH`);
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
