'use strict';

var parsePair = require('./parse/parse-pair');
var directive = require('./directive');
var createDirective = directive.create;
var isPairDirective = directive.isPair;
var hasDirective = directive.has;
var ViewModel = require('./view-model');
var parseText = require('./parse/parseText.js');

var reIncludeExpr = /\{\{\s*(.+?)\s*\}\}/;

var walk = function(node, callback) {
    if (node.nodeType === 1 || node.nodeType === 3) {
        var returnValue = callback(node);
        if (returnValue === false) {
            return;
        }
    }

    if (node.nodeType === 1) {
        var current = node.firstChild;
        while (current) {
            walk(current, callback);
            current = current.nextSibling;
        }
    }
};

// parse text expression
var parseInlineText = function(line) {
    var parsed = parseText(line);
    if(!parsed.length) {
        return '';
    }
    return parsed.filter(function(item) {
        // exclude empty text item
            return !!item.value;
        }).map(function(item) {
            return item.type === 'text' ? 
                '"' + item.value + '"' :
                '(' + item.value + ')';
        }).join(' + ');
};

// really instance directives
var bindDirs = function(element, dirs, context) {
    var dir, type, pairs, pair;
    var i, j, k, l;
    for (i = 0, j = dirs.length; i < j; i++) {
        dir = dirs[i];
        type = dir.type;

        if (isPairDirective(type)) {
            pairs = parsePair(dir.value);
            for (k = 0, l = pairs.length; k < l; k++) {
                pair = pairs[k];
                createDirective(dir.type, {
                    element: element,
                    expression: pair.value,
                    context: context,
                    key: pair.key,
                    attr: dir.attr
                });
            }
        } else {
            createDirective(dir.type, {
                element: element,
                expression: dir.value,
                context: context,
                attr: dir.attr
            });
        }
    }
};

// compile element with corresponding context instance
var compile = function(element, context) {
    context = new ViewModel(context);
    walk(element, function(el) {
        var dirs = [];
        var attributes, attrNode, attrName, attrValue;
        var i, j;
        var text;
        if (el.nodeType === 1) {
            attributes = el.attributes;

            for (i = 0, j = attributes.length; i < j; i++) {
                attrNode = attributes.item(i);
                attrName = attrNode.nodeName;
                attrValue = attrNode.nodeValue;

                if (reIncludeExpr.test(attrValue)) {
                    dirs.push({
                        type: 'hy-attr',
                        attr: attrName,
                        value: parseInlineText(attrValue)
                    });
                }

                if (hasDirective(attrName)) {
                    dirs.push({
                        type: attrName,
                        attr: attrName,
                        value: attrValue
                    });
                }

                if (attrName === 'hy-repeat') {
                    createDirective('hy-repeat', {
                        element: el,
                        expression: attrNode.nodeValue,
                        context: context
                    });

                    return false;
                }
            }
        } else if (el.nodeType === 3) {
            text = el.nodeValue;
            if (reIncludeExpr.test(text)) {
                dirs.push({
                    type: 'hy-text',
                    value: parseInlineText(text)
                });
            }
        }

        if (dirs.length > 0) {
            bindDirs(el, dirs, context);
        }
    });
};

module.exports = compile;
