'use strict';

var jsep = require('jsep');

var parsedCache = {};
var dependsCache = {};
var fnCache = {};

var reWhitespace = /^\s+$/;

// parse member expression like 'a.b'
var parseMemberExpression = function(ast, options) {
    var path = '';
    var currentObject = ast.object;
    var stack = [ast.property.name];
    var depends = options && options.depends;

    while (currentObject) {
        if (currentObject.type === 'Identifier') {
            stack.unshift(currentObject.name);
            path = stack.join('.');
            break;
        } else if (currentObject.type === 'MemberExpression') {
            stack.unshift(currentObject.property.name);
            currentObject = currentObject.object;
        }
    }
    if (depends && depends.indexOf(path) === -1) {
        depends.push(path);
    }
    return path;
};
// convert ast to function code
var astToCodeMap = {
    'Literal': function(ast, options) {
        // because Literal will be function's source code, specially handle string
        // return ' +$index+ '; must be transformed to return '\' \'+$index+\' \'';
        return typeof ast.value === 'string' ? '"' + ast.value + '"' : '' + ast.value;
    },
    'ThisExpression': function(ast, options) {
        return 'this';
    },
    // '+a'
    'UnaryExpression': function(ast, options) {
        return ast.operator + astToCode(ast.argument, options);
    },
    'MemberExpression': function(ast, options) {
        return 'this.' + parseMemberExpression(ast, options);
    },
    // 'a + b', add pair to preserve execute order
    'BinaryExpression': function(ast, options) {
        return '(' + astToCode(ast.left, options) + ast.operator + astToCode(ast.right, options) + ')';
    },
    // 'a > 0 ? "yes" : "no"'
    'ConditionalExpression': function(ast, options) {
        return '(' + astToCode(ast.test, options) + ' ? (' + astToCode(ast.consequent, options) + ') : (' + astToCode(ast.alternate, options) + '))';
    },
    // 'a'
    'Identifier': function(ast, options) {
        var depends = options.depends;
        // so when directive is event, specially handle $event
        // $event is not this.$event and should not push to depends
        if(options.event && ast.name === '$event') {
            options.toInjectEvent = true;
            return ast.name;
        } 

        if (depends && depends.indexOf(ast.name) === -1) {
            depends.push(ast.name);
        }
        return 'this.' + ast.name;
    },
    // '[obj.]execute(parameters)'
    'CallExpression': function(ast, options) {
        var args = ast.arguments;
        var callee = ast.callee;
        var parsedValues = [];
        if (args) {
            args.forEach(function(arg) {
                parsedValues.push(astToCode(arg, options));
            });
        }
        if (callee.type === 'Identifier') {
            return astToCode(callee, options) + '(' + parsedValues.join(', ') + ')';
        }
        return astToCode(callee.object, options) + '.' +
            callee.property.name + '(' + parsedValues.join(', ') + ')';
    },
    'ArrayExpression': function(ast, options) {
        var elements = ast.elements,
            mappedValues = [];

        elements.forEach(function(item) {
            mappedValues.push(astToCode(item, options));
        });

        return '[' + mappedValues.join(', ') + ']';
    }
};
astToCodeMap.LogicalExpression = astToCodeMap.BinaryExpression;

function astToCode(ast, options) {
    return astToCodeMap[ast.type](ast, options);
}

// parse expression to code string
var parseExpr = function(string, options) {

    options = options || {};
    var depends;
    var result = parsedCache[string];

    if (!result) {
        var parsedTree = jsep(string);

        depends = options.depends = [];
        result = astToCode(parsedTree, options);

        parsedCache[string] = result;
        dependsCache[string] = depends;
    }

    return result;
};

// get depends via raw string
var getDepends = function(string) {
    var depends = dependsCache[string];

    if (!depends) {
        parseExpr(string);
        depends = dependsCache[string];
    }

    return depends;
};

// parse string to executable fn(valueFn)
var compileExpr = function(string, context, options) {
    var converted = parseExpr(string, options);
    // add '()' to preserve unexpected newline
    var body = 'return (' + converted + ');';
    var fn = fnCache[string];
    if (!fn) {
        /*jshint -W054 */
        fn = (options && options.toInjectEvent) ? new Function('$event', body) : 
            new Function(body);
        /*jshint +W054 */
        fnCache[string] = fn;
    }
    if (context) {
        return fn.bind(context);
    }
    return fn;
};

module.exports = {
    parse: parseExpr,
    getDepends: getDepends,
    compile: compileExpr,
    cache: function() {
        return {
            parsedCache: parsedCache,
            dependsCache: dependsCache,
            fnCache: fnCache
        };
    }
};
