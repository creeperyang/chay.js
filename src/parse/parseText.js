'use strict';

var reExpr = /\{\{([\s\S]+?)\}\}|$/g; // non-greedy match

var appendText = function(result, text) {
    if (text !== undefined) {
        result.push({
            type: 'text',
            value: text
        });
    }
};

var appendExpr = function(result, text) {
    if (text) {
        result.push({
            type: 'expression',
            value: text
        });
    }
};

var parseText = function(line, result) {
    result = result || [];
    var index = 0;
    // remove \r \n firstly
    line = line.replace(/\n/g,'').replace(/\r/g, '');

    line.replace(reExpr, function(match, expr, offset) {
            appendText(result, line.slice(index, offset));
            appendExpr(result, expr);
            index = offset + match.length;
            return match;
        });

    return result;
};

module.exports = parseText;
