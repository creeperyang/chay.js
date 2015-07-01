'use strict';

// parse key-value pairs string 
// '{key1: value1, key2: value2}'

var rePair = /^\s*\{([\s\S]+)\}\s*$/;

// remove the outmost '{}'
// '{key:value}' --> 'key:value'
var prepareLine = function(line) {
    var result = rePair.exec(line);
    return result ? result[1] : line;
};

var parsePair = function(line) {

    line = prepareLine(line);
    if(!line) {
        return;
    }
    
    var result = [];
    var currentPair = {};
    var keyBeginIndex = 0;
    var valueBeginIndex = 0;

    var charCount = line.length;
    var index = 0;
    var level = 0;
    var prevChar, curChar;
    var quotationChar;

    function appendPair() {
        currentPair.literal = line.slice(keyBeginIndex, index).trim();

        if (currentPair.value === undefined) {
            currentPair.value = line.slice(valueBeginIndex, index).trim();
        }

        if (index === 0 || currentPair.value) {
            result.push(currentPair);
        }

        currentPair = {};
        keyBeginIndex = valueBeginIndex = index + 1;
    }

    for(; index < charCount; index++) {
        prevChar = curChar;
        curChar = line.charAt(index);

        // when encourter quotation mark
        if (curChar === '"' || curChar === '\'') {
            // the first part of quotation
            if (!quotationChar) {
                quotationChar = curChar;
                level++;
                continue;
            }
            // check if to finish quotation
            if (quotationChar && prevChar !== '\\' && curChar === quotationChar) {
                quotationChar = null;
                level--;
                continue;
            }
        }

        // if not inside quotation mask
        if(!quotationChar) {
            if (curChar === ',' && level === 0) {
                appendPair();
            } else if (curChar === ':' && !currentPair.key && !currentPair.value) {
                var key = line.slice(keyBeginIndex, index).trim();
                if (key.length > 0) {
                    currentPair.key = key;
                    valueBeginIndex = index + 1;
                }
            } else if (curChar === '(' || curChar === '[' || curChar === '{') {
                level++;
            } else if (curChar === ')' || curChar === ']' || curChar === '}') {
                level--;
            }
        }
    }

    // ensure appendPair() call once outside of loop
    // the only or the last 'key: value'
    if (index === 0 || keyBeginIndex !== index) {
        appendPair();
    }

    return result;
};

module.exports = parsePair;
