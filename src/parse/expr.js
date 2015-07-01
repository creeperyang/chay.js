'use strict';

var jsep = require('jsep');

var parsedCache = {};
var dependsCache = {};
var fnCache = {};

var reWhitespace = /^\s+$/;

// parse expression to code string
var parseExpr = function(string) {

    var depends;

    function parseMemberExpression(ast) {
        var path = '';
        var currentObject = ast.object;
        var stack = [ast.property.name];

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
    }

    function astToCode(ast) {
        // '"str"'
        if (ast.type === 'Literal') {
            // because Literal will be function's source code, specially handle string
            // return ' +$index+ '; must be transformed to return '\' \'+$index+\' \'';
            return typeof ast.value === 'string' ? '"' + ast.value + '"' : '' + ast.value;
        
        // 'this'
        } else if (ast.type === 'ThisExpression') {
            return 'this';
        
        // '+a'
        } else if (ast.type === 'UnaryExpression') {
            return ast.operator + astToCode(ast.argument);
        
        // 'a + b', add pair to preserve execute order
        } else if (ast.type === 'BinaryExpression' || ast.type === 'LogicalExpression') {
            return '(' + astToCode(ast.left) + ast.operator + astToCode(ast.right) + ')';
        
        // 'a > 0 ? "yes" : "no"'
        } else if (ast.type === 'ConditionalExpression') {
            return '(' + astToCode(ast.test) + ' ? (' + astToCode(ast.consequent) + ') : (' + astToCode(ast.alternate) + '))';
        
        // 'a'
        } else if (ast.type === 'Identifier') {
            if (depends && depends.indexOf(ast.name) === -1) {
                depends.push(ast.name);
            }
            return 'this.' + ast.name;

        // '[obj.]execute(parameters)'
        } else if (ast.type === 'CallExpression') {
            var args = ast.arguments;
            var callee = ast.callee;
            var parsedValues = [];
            if (args) {
                args.forEach(function(arg) {
                    parsedValues.push(astToCode(arg));
                });
            }
            if (callee.type === 'Identifier') {
                return astToCode(callee) + '(' + parsedValues.join(', ') + ')';
            }
            return astToCode(callee.object) + '.' + callee.property.name + '(' + parsedValues.join(', ') + ')';
        
        // 
        } else if (ast.type === 'MemberExpression') {
            return 'this.' + parseMemberExpression(ast);
        } else if (ast.type === 'ArrayExpression') {
            var elements = ast.elements,
                mappedValues = [];

            elements.forEach(function(item) {
                mappedValues.push(astToCode(item));
            });

            return '[' + mappedValues.join(', ') + ']';
        }
    }

    var result = parsedCache[string];

    if (!result) {
        var parsedTree = jsep(string);

        depends = [];
        result = astToCode(parsedTree);

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
var compileExpr = function(string, context) {
    var converted = parseExpr(string);
    // add '()' to preserve unexpected newline
    var body = 'return (' + converted + ');';

    var fn = fnCache[string];
    if (!fn) {
        /*jshint -W054 */
        fn = new Function(body);
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
