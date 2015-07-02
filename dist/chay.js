(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
//     JavaScript Expression Parser (JSEP) 0.3.0
//     JSEP may be freely distributed under the MIT License
//     http://jsep.from.so/

/*global module: true, exports: true, console: true */
(function (root) {
	'use strict';
	// Node Types
	// ----------
	
	// This is the full set of types that any JSEP node can be.
	// Store them here to save space when minified
	var COMPOUND = 'Compound',
		IDENTIFIER = 'Identifier',
		MEMBER_EXP = 'MemberExpression',
		LITERAL = 'Literal',
		THIS_EXP = 'ThisExpression',
		CALL_EXP = 'CallExpression',
		UNARY_EXP = 'UnaryExpression',
		BINARY_EXP = 'BinaryExpression',
		LOGICAL_EXP = 'LogicalExpression',
		CONDITIONAL_EXP = 'ConditionalExpression',
		ARRAY_EXP = 'ArrayExpression',

		PERIOD_CODE = 46, // '.'
		COMMA_CODE  = 44, // ','
		SQUOTE_CODE = 39, // single quote
		DQUOTE_CODE = 34, // double quotes
		OPAREN_CODE = 40, // (
		CPAREN_CODE = 41, // )
		OBRACK_CODE = 91, // [
		CBRACK_CODE = 93, // ]
		QUMARK_CODE = 63, // ?
		SEMCOL_CODE = 59, // ;
		COLON_CODE  = 58, // :

		throwError = function(message, index) {
			var error = new Error(message + ' at character ' + index);
			error.index = index;
			error.description = message;
			throw error;
		},

	// Operations
	// ----------
	
	// Set `t` to `true` to save space (when minified, not gzipped)
		t = true,
	// Use a quickly-accessible map to store all of the unary operators
	// Values are set to `true` (it really doesn't matter)
		unary_ops = {'-': t, '!': t, '~': t, '+': t},
	// Also use a map for the binary operations but set their values to their
	// binary precedence for quick reference:
	// see [Order of operations](http://en.wikipedia.org/wiki/Order_of_operations#Programming_language)
		binary_ops = {
			'||': 1, '&&': 2, '|': 3,  '^': 4,  '&': 5,
			'==': 6, '!=': 6, '===': 6, '!==': 6,
			'<': 7,  '>': 7,  '<=': 7,  '>=': 7, 
			'<<':8,  '>>': 8, '>>>': 8,
			'+': 9, '-': 9,
			'*': 10, '/': 10, '%': 10
		},
	// Get return the longest key length of any object
		getMaxKeyLen = function(obj) {
			var max_len = 0, len;
			for(var key in obj) {
				if((len = key.length) > max_len && obj.hasOwnProperty(key)) {
					max_len = len;
				}
			}
			return max_len;
		},
		max_unop_len = getMaxKeyLen(unary_ops),
		max_binop_len = getMaxKeyLen(binary_ops),
	// Literals
	// ----------
	// Store the values to return for the various literals we may encounter
		literals = {
			'true': true,
			'false': false,
			'null': null
		},
	// Except for `this`, which is special. This could be changed to something like `'self'` as well
		this_str = 'this',
	// Returns the precedence of a binary operator or `0` if it isn't a binary operator
		binaryPrecedence = function(op_val) {
			return binary_ops[op_val] || 0;
		},
	// Utility function (gets called from multiple places)
	// Also note that `a && b` and `a || b` are *logical* expressions, not binary expressions
		createBinaryExpression = function (operator, left, right) {
			var type = (operator === '||' || operator === '&&') ? LOGICAL_EXP : BINARY_EXP;
			return {
				type: type,
				operator: operator,
				left: left,
				right: right
			};
		},
		// `ch` is a character code in the next three functions
		isDecimalDigit = function(ch) {
			return (ch >= 48 && ch <= 57); // 0...9
		},
		isIdentifierStart = function(ch) {
			return (ch === 36) || (ch === 95) || // `$` and `_`
					(ch >= 65 && ch <= 90) || // A...Z
					(ch >= 97 && ch <= 122); // a...z
		},
		isIdentifierPart = function(ch) {
			return (ch === 36) || (ch === 95) || // `$` and `_`
					(ch >= 65 && ch <= 90) || // A...Z
					(ch >= 97 && ch <= 122) || // a...z
					(ch >= 48 && ch <= 57); // 0...9
		},

		// Parsing
		// -------
		// `expr` is a string with the passed in expression
		jsep = function(expr) {
			// `index` stores the character number we are currently at while `length` is a constant
			// All of the gobbles below will modify `index` as we move along
			var index = 0,
				charAtFunc = expr.charAt,
				charCodeAtFunc = expr.charCodeAt,
				exprI = function(i) { return charAtFunc.call(expr, i); },
				exprICode = function(i) { return charCodeAtFunc.call(expr, i); },
				length = expr.length,

				// Push `index` up to the next non-space character
				gobbleSpaces = function() {
					var ch = exprICode(index);
					// space or tab
					while(ch === 32 || ch === 9) {
						ch = exprICode(++index);
					}
				},
				
				// The main parsing function. Much of this code is dedicated to ternary expressions
				gobbleExpression = function() {
					var test = gobbleBinaryExpression(),
						consequent, alternate;
					gobbleSpaces();
					if(exprICode(index) === QUMARK_CODE) {
						// Ternary expression: test ? consequent : alternate
						index++;
						consequent = gobbleExpression();
						if(!consequent) {
							throwError('Expected expression', index);
						}
						gobbleSpaces();
						if(exprICode(index) === COLON_CODE) {
							index++;
							alternate = gobbleExpression();
							if(!alternate) {
								throwError('Expected expression', index);
							}
							return {
								type: CONDITIONAL_EXP,
								test: test,
								consequent: consequent,
								alternate: alternate
							};
						} else {
							throwError('Expected :', index);
						}
					} else {
						return test;
					}
				},

				// Search for the operation portion of the string (e.g. `+`, `===`)
				// Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
				// and move down from 3 to 2 to 1 character until a matching binary operation is found
				// then, return that binary operation
				gobbleBinaryOp = function() {
					gobbleSpaces();
					var biop, to_check = expr.substr(index, max_binop_len), tc_len = to_check.length;
					while(tc_len > 0) {
						if(binary_ops.hasOwnProperty(to_check)) {
							index += tc_len;
							return to_check;
						}
						to_check = to_check.substr(0, --tc_len);
					}
					return false;
				},

				// This function is responsible for gobbling an individual expression,
				// e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
				gobbleBinaryExpression = function() {
					var ch_i, node, biop, prec, stack, biop_info, left, right, i;

					// First, try to get the leftmost thing
					// Then, check to see if there's a binary operator operating on that leftmost thing
					left = gobbleToken();
					biop = gobbleBinaryOp();

					// If there wasn't a binary operator, just return the leftmost node
					if(!biop) {
						return left;
					}

					// Otherwise, we need to start a stack to properly place the binary operations in their
					// precedence structure
					biop_info = { value: biop, prec: binaryPrecedence(biop)};

					right = gobbleToken();
					if(!right) {
						throwError("Expected expression after " + biop, index);
					}
					stack = [left, biop_info, right];

					// Properly deal with precedence using [recursive descent](http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm)
					while((biop = gobbleBinaryOp())) {
						prec = binaryPrecedence(biop);

						if(prec === 0) {
							break;
						}
						biop_info = { value: biop, prec: prec };

						// Reduce: make a binary expression from the three topmost entries.
						while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
							right = stack.pop();
							biop = stack.pop().value;
							left = stack.pop();
							node = createBinaryExpression(biop, left, right);
							stack.push(node);
						}

						node = gobbleToken();
						if(!node) {
							throwError("Expected expression after " + biop, index);
						}
						stack.push(biop_info, node);
					}

					i = stack.length - 1;
					node = stack[i];
					while(i > 1) {
						node = createBinaryExpression(stack[i - 1].value, stack[i - 2], node); 
						i -= 2;
					}
					return node;
				},

				// An individual part of a binary expression:
				// e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
				gobbleToken = function() {
					var ch, to_check, tc_len;
					
					gobbleSpaces();
					ch = exprICode(index);

					if(isDecimalDigit(ch) || ch === PERIOD_CODE) {
						// Char code 46 is a dot `.` which can start off a numeric literal
						return gobbleNumericLiteral();
					} else if(ch === SQUOTE_CODE || ch === DQUOTE_CODE) {
						// Single or double quotes
						return gobbleStringLiteral();
					} else if(isIdentifierStart(ch) || ch === OPAREN_CODE) { // open parenthesis
						// `foo`, `bar.baz`
						return gobbleVariable();
					} else if (ch === OBRACK_CODE) {
						return gobbleArray();
					} else {
						to_check = expr.substr(index, max_unop_len);
						tc_len = to_check.length;
						while(tc_len > 0) {
							if(unary_ops.hasOwnProperty(to_check)) {
								index += tc_len;
								return {
									type: UNARY_EXP,
									operator: to_check,
									argument: gobbleToken(),
									prefix: true
								};
							}
							to_check = to_check.substr(0, --tc_len);
						}
						
						return false;
					}
				},
				// Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
				// keep track of everything in the numeric literal and then calling `parseFloat` on that string
				gobbleNumericLiteral = function() {
					var number = '', ch, chCode;
					while(isDecimalDigit(exprICode(index))) {
						number += exprI(index++);
					}

					if(exprICode(index) === PERIOD_CODE) { // can start with a decimal marker
						number += exprI(index++);

						while(isDecimalDigit(exprICode(index))) {
							number += exprI(index++);
						}
					}
					
					ch = exprI(index);
					if(ch === 'e' || ch === 'E') { // exponent marker
						number += exprI(index++);
						ch = exprI(index);
						if(ch === '+' || ch === '-') { // exponent sign
							number += exprI(index++);
						}
						while(isDecimalDigit(exprICode(index))) { //exponent itself
							number += exprI(index++);
						}
						if(!isDecimalDigit(exprICode(index-1)) ) {
							throwError('Expected exponent (' + number + exprI(index) + ')', index);
						}
					}
					

					chCode = exprICode(index);
					// Check to make sure this isn't a variable name that start with a number (123abc)
					if(isIdentifierStart(chCode)) {
						throwError('Variable names cannot start with a number (' +
									number + exprI(index) + ')', index);
					} else if(chCode === PERIOD_CODE) {
						throwError('Unexpected period', index);
					}

					return {
						type: LITERAL,
						value: parseFloat(number),
						raw: number
					};
				},

				// Parses a string literal, staring with single or double quotes with basic support for escape codes
				// e.g. `"hello world"`, `'this is\nJSEP'`
				gobbleStringLiteral = function() {
					var str = '', quote = exprI(index++), closed = false, ch;

					while(index < length) {
						ch = exprI(index++);
						if(ch === quote) {
							closed = true;
							break;
						} else if(ch === '\\') {
							// Check for all of the common escape codes
							ch = exprI(index++);
							switch(ch) {
								case 'n': str += '\n'; break;
								case 'r': str += '\r'; break;
								case 't': str += '\t'; break;
								case 'b': str += '\b'; break;
								case 'f': str += '\f'; break;
								case 'v': str += '\x0B'; break;
							}
						} else {
							str += ch;
						}
					}

					if(!closed) {
						throwError('Unclosed quote after "'+str+'"', index);
					}

					return {
						type: LITERAL,
						value: str,
						raw: quote + str + quote
					};
				},
				
				// Gobbles only identifiers
				// e.g.: `foo`, `_value`, `$x1`
				// Also, this function checks if that identifier is a literal:
				// (e.g. `true`, `false`, `null`) or `this`
				gobbleIdentifier = function() {
					var ch = exprICode(index), start = index, identifier;

					if(isIdentifierStart(ch)) {
						index++;
					} else {
						throwError('Unexpected ' + exprI(index), index);
					}

					while(index < length) {
						ch = exprICode(index);
						if(isIdentifierPart(ch)) {
							index++;
						} else {
							break;
						}
					}
					identifier = expr.slice(start, index);

					if(literals.hasOwnProperty(identifier)) {
						return {
							type: LITERAL,
							value: literals[identifier],
							raw: identifier
						};
					} else if(identifier === this_str) {
						return { type: THIS_EXP };
					} else {
						return {
							type: IDENTIFIER,
							name: identifier
						};
					}
				},

				// Gobbles a list of arguments within the context of a function call
				// or array literal. This function also assumes that the opening character
				// `(` or `[` has already been gobbled, and gobbles expressions and commas
				// until the terminator character `)` or `]` is encountered.
				// e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
				gobbleArguments = function(termination) {
					var ch_i, args = [], node;
					while(index < length) {
						gobbleSpaces();
						ch_i = exprICode(index);
						if(ch_i === termination) { // done parsing
							index++;
							break;
						} else if (ch_i === COMMA_CODE) { // between expressions
							index++;
						} else {
							node = gobbleExpression();
							if(!node || node.type === COMPOUND) {
								throwError('Expected comma', index);
							}
							args.push(node);
						}
					}
					return args;
				},

				// Gobble a non-literal variable name. This variable name may include properties
				// e.g. `foo`, `bar.baz`, `foo['bar'].baz`
				// It also gobbles function calls:
				// e.g. `Math.acos(obj.angle)`
				gobbleVariable = function() {
					var ch_i, node;
					ch_i = exprICode(index);
						
					if(ch_i === OPAREN_CODE) {
						node = gobbleGroup();
					} else {
						node = gobbleIdentifier();
					}
					gobbleSpaces();
					ch_i = exprICode(index);
					while(ch_i === PERIOD_CODE || ch_i === OBRACK_CODE || ch_i === OPAREN_CODE) {
						index++;
						if(ch_i === PERIOD_CODE) {
							gobbleSpaces();
							node = {
								type: MEMBER_EXP,
								computed: false,
								object: node,
								property: gobbleIdentifier()
							};
						} else if(ch_i === OBRACK_CODE) {
							node = {
								type: MEMBER_EXP,
								computed: true,
								object: node,
								property: gobbleExpression()
							};
							gobbleSpaces();
							ch_i = exprICode(index);
							if(ch_i !== CBRACK_CODE) {
								throwError('Unclosed [', index);
							}
							index++;
						} else if(ch_i === OPAREN_CODE) {
							// A function call is being made; gobble all the arguments
							node = {
								type: CALL_EXP,
								'arguments': gobbleArguments(CPAREN_CODE),
								callee: node
							};
						}
						gobbleSpaces();
						ch_i = exprICode(index);
					}
					return node;
				},

				// Responsible for parsing a group of things within parentheses `()`
				// This function assumes that it needs to gobble the opening parenthesis
				// and then tries to gobble everything within that parenthesis, assuming
				// that the next thing it should see is the close parenthesis. If not,
				// then the expression probably doesn't have a `)`
				gobbleGroup = function() {
					index++;
					var node = gobbleExpression();
					gobbleSpaces();
					if(exprICode(index) === CPAREN_CODE) {
						index++;
						return node;
					} else {
						throwError('Unclosed (', index);
					}
				},

				// Responsible for parsing Array literals `[1, 2, 3]`
				// This function assumes that it needs to gobble the opening bracket
				// and then tries to gobble the expressions as arguments.
				gobbleArray = function() {
					index++;
					return {
						type: ARRAY_EXP,
						elements: gobbleArguments(CBRACK_CODE)
					};
				},

				nodes = [], ch_i, node;
				
			while(index < length) {
				ch_i = exprICode(index);

				// Expressions can be separated by semicolons, commas, or just inferred without any
				// separators
				if(ch_i === SEMCOL_CODE || ch_i === COMMA_CODE) {
					index++; // ignore separators
				} else {
					// Try to gobble each expression individually
					if((node = gobbleExpression())) {
						nodes.push(node);
					// If we weren't able to find a binary expression and are out of room, then
					// the expression passed in probably has too much
					} else if(index < length) {
						throwError('Unexpected "' + exprI(index) + '"', index);
					}
				}
			}

			// If there's only one expression just try returning the expression
			if(nodes.length === 1) {
				return nodes[0];
			} else {
				return {
					type: COMPOUND,
					body: nodes
				};
			}
		};

	// To be filled in by the template
	jsep.version = '0.3.0';
	jsep.toString = function() { return 'JavaScript Expression Parser (JSEP) v' + jsep.version; };

	/**
	 * @method jsep.addUnaryOp
	 * @param {string} op_name The name of the unary op to add
	 * @return jsep
	 */
	jsep.addUnaryOp = function(op_name) {
		unary_ops[op_name] = t; return this;
	};

	/**
	 * @method jsep.addBinaryOp
	 * @param {string} op_name The name of the binary op to add
	 * @param {number} precedence The precedence of the binary op (can be a float)
	 * @return jsep
	 */
	jsep.addBinaryOp = function(op_name, precedence) {
		max_binop_len = Math.max(op_name.length, max_binop_len);
		binary_ops[op_name] = precedence;
		return this;
	};

	/**
	 * @method jsep.removeUnaryOp
	 * @param {string} op_name The name of the unary op to remove
	 * @return jsep
	 */
	jsep.removeUnaryOp = function(op_name) {
		delete unary_ops[op_name];
		if(op_name.length === max_unop_len) {
			max_unop_len = getMaxKeyLen(unary_ops);
		}
		return this;
	};

	/**
	 * @method jsep.removeBinaryOp
	 * @param {string} op_name The name of the binary op to remove
	 * @return jsep
	 */
	jsep.removeBinaryOp = function(op_name) {
		delete binary_ops[op_name];
		if(op_name.length === max_binop_len) {
			max_binop_len = getMaxKeyLen(binary_ops);
		}
		return this;
	};

	// In desktop environments, have a way to restore the old value for `jsep`
	if (typeof exports === 'undefined') {
		var old_jsep = root.jsep;
		// The star of the show! It's a function!
		root.jsep = jsep;
		// And a courteous function willing to move out of the way for other similarly-named objects!
		jsep.noConflict = function() {
			if(root.jsep === jsep) {
				root.jsep = old_jsep;
			}
			return jsep;
		};
	} else {
		// In Node.JS environments
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = jsep;
		} else {
			exports.parse = jsep;
		}
	}
}(this));

},{}],3:[function(require,module,exports){

module.exports = exports = Change;

/*!
 * Change object constructor
 *
 * The `change` object passed to Object.observe callbacks
 * is immutable so we create a new one to modify.
 */

function Change (path, change) {
  this.path = path;
  this.name = change.name;
  this.type = change.type;
  this.object = change.object;
  this.value = change.object[change.name];
  this.oldValue = change.oldValue;
}


},{}],4:[function(require,module,exports){
// http://wiki.ecmascript.org/doku.php?id=harmony:observe

var Change = require('./change');
var Emitter = require('events').EventEmitter;
var debug = require('debug')('observed');

module.exports = exports = Observable;

/**
 * Observable constructor.
 *
 * The passed `subject` will be observed for changes to
 * all properties, included nested objects and arrays.
 *
 * An `EventEmitter` will be returned. This emitter will
 * emit the following events:
 *
 * - new
 * - updated
 * - deleted
 * - reconfigured
 *
 * @param {Object} subject
 * @param {Observable} [parent] (internal use)
 * @param {String} [prefix] (internal use)
 * @return {EventEmitter}
 */

function Observable (subject, parent, prefix) {
  if ('object' != typeof subject)
    throw new TypeError('object expected. got: ' + typeof subject);

  if (!(this instanceof Observable))
    return new Observable(subject, parent, prefix);

  debug('new', subject, !!parent, prefix);

  Emitter.call(this);
  this._bind(subject, parent, prefix);
};

// add emitter capabilities
for (var i in Emitter.prototype) {
  Observable.prototype[i] = Emitter.prototype[i];
}

Observable.prototype.observers = undefined;
Observable.prototype.onchange = undefined;
Observable.prototype.subject = undefined;

/**
 * Binds this Observable to `subject`.
 *
 * @param {Object} subject
 * @param {Observable} [parent]
 * @param {String} [prefix]
 * @api private
 */

Observable.prototype._bind = function (subject, parent, prefix) {
  if (this.subject) throw new Error('already bound!');
  if (null == subject) throw new TypeError('subject cannot be null');

  debug('_bind', subject);

  this.subject = subject;

  if (parent) {
    parent.observers.push(this);
  } else {
    this.observers = [this];
  }

  this.onchange = onchange(parent || this, prefix);
  Object.observe(this.subject, this.onchange);

  this._walk(parent || this, prefix);
}

/**
 * Walk down through the tree of our `subject`, observing
 * objects along the way.
 *
 * @param {Observable} [parent]
 * @param {String} [prefix]
 * @api private
 */

Observable.prototype._walk = function (parent, prefix) {
  debug('_walk');

  var object = this.subject;

  // keys?
  Object.getOwnPropertyNames(object).forEach(function (name) {
    var value = object[name];

    if ('object' != typeof value) return;
    if (null == value) return;

    var path = prefix
      ? prefix + '.' + name
      : name;

    new Observable(value, parent, path);
  });
}

/**
 * Stop listening to all bound objects
 */

Observable.prototype.stop = function () {
  debug('stop');

  this.observers.forEach(function (observer) {
    Object.unobserve(observer.subject, observer.onchange);
  });
}

/**
 * Stop listening to changes on `subject`
 *
 * @param {Object} subject
 * @api private
 */

Observable.prototype._remove = function (subject) {
  debug('_remove', subject);

  this.observers = this.observers.filter(function (observer) {
    if (subject == observer.subject) {
      Object.unobserve(observer.subject, observer.onchange);
      return false;
    }

    return true;
  });
}

/*!
 * Creates an Object.observe `onchange` listener
 */

function onchange (parent, prefix) {
  return function (ary) {
    debug('onchange');

    ary.forEach(function (change) {
      var object = change.object;
      var type = change.type;
      var name = change.name;
      var value = object[name];

      var path = prefix
        ? prefix + '.' + name
        : name

      if ('new' == type && null != value && 'object' == typeof value) {
        new Observable(value, parent, path);
      } else if ('deleted' == type && 'object' == typeof change.oldValue) {
        parent._remove(change.oldValue);
      }

      change = new Change(path, change);
      parent.emit(type, change);
      parent.emit(type + ' ' + path, change);
      parent.emit('changed', change);
    })
  }
}


},{"./change":3,"debug":5,"events":1}],5:[function(require,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],6:[function(require,module,exports){
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

},{"./directive":7,"./parse/parse-pair":17,"./parse/parseText.js":18,"./view-model":19}],7:[function(require,module,exports){
'use strict';

// register all directives

var directiveMap = {};

var registerDirective = function(name, directive) {
    if (name && typeof directive === 'function') {
        directiveMap[name] = directive;
    }
};

var createDirective = function(name, options) {
    if (!name) {
        return;
    }
    var CreateDirective = directiveMap[name];
    return new CreateDirective(options);
};

var RepeatDirective = require('./directive/repeat');
var AttrDirective = require('./directive/attr');
var TextDirective = require('./directive/text');
var ClassDirective = require('./directive/class');
var EventDirective = require('./directive/event');
var ModelDirective = require('./directive/model');

registerDirective('hy-repeat', RepeatDirective);
registerDirective('hy-attr', AttrDirective);
registerDirective('hy-text', TextDirective);
registerDirective('hy-class', ClassDirective);
registerDirective('hy-event', EventDirective);
registerDirective('hy-model', ModelDirective);

var events = ['click', 'dblclick', 'mousedown', 'mouseup', 'focus', 'blur'];
var createSubEventDir = function(event) {
    var eventDir = function(options) {
        EventDirective.call(this, options);
    };
    eventDir.prototype = new EventDirective();
    eventDir.prototype.isPair = false;
    eventDir.prototype.event = event;
    return eventDir;
};

for (var i = 0, j = events.length; i < j; i++) {
    var eventType = events[i];
    registerDirective('hy-' + eventType, createSubEventDir(eventType));
}

module.exports = {
    register: registerDirective,
    create: createDirective,
    isPair: function(type) {
        var fn = directiveMap[type];
        if (!fn) {
            return false;
        }
        return !!fn.prototype.isPair;
    },
    has: function(type) {
        return type in directiveMap;
    }
};

},{"./directive/attr":8,"./directive/class":9,"./directive/event":11,"./directive/model":12,"./directive/repeat":13,"./directive/text":14}],8:[function(require,module,exports){
'use strict';

var Directive = require('./directive.js');

function AttrDirective(options) {
    this.attr = options && options.attr;
    
    Directive.call(this, options);
}

AttrDirective.prototype = new Directive();

AttrDirective.prototype.update = function() {
    if (this.attr && this.element && this.valueFn) {
        this.element[this.attr] = this.valueFn() || '';
    }
};

module.exports = AttrDirective;

},{"./directive.js":10}],9:[function(require,module,exports){
'use strict';

var Directive = require('./directive.js');

function ClassDirective(options) {
    this.className = options && options.key;
    Directive.call(this, options);
}

ClassDirective.prototype = new Directive();

ClassDirective.prototype.isPair = true;

ClassDirective.prototype.update = function() {
    var element = this.element;
    var value;
    if(element.nodeType !== 1 || !this.valueFn) {
        return;
    }
    value = !!this.valueFn();
    if (value) {
        element.classList.add(this.className);
    } else {
        element.classList.remove(this.className);
    }
};

module.exports = ClassDirective;

},{"./directive.js":10}],10:[function(require,module,exports){
'use strict';

var expr = require('../parse/expr');
var compileExpr = expr.compile;
var getDepends = expr.getDepends;

function Directive(options) {
    // just return this if options is empty
    // the sub directive always set prototype = new Directive()
    if(!options) {
        return this;
    }

    this.element = options.element;
    this.expression = options.expression;
    this.context = options.context;

    this.bind();
}

// sometimes, when subclass call bind, they may apply options to custom
Directive.prototype.bind = function(options) {
    var directive = this;
    if (directive.element && directive.expression && directive.context) {
        directive.valueFn = compileExpr(directive.expression, directive.context, options);

        var depends = getDepends(directive.expression);
        var context = directive.context;

        depends.forEach(function(depend) {
            context.$watch(depend, directive);
        });

        directive.update();
    }
};

Directive.prototype.unbind = function() {
    var depends = getDepends(this.expression);
    var context = this.context;
    var directive = this;

    depends.forEach(function(depend) {
        context.$unwatch(depend, directive);
    });
};

Directive.prototype.update = function() {

};

Directive.prototype.destroy = function() {
    this.unbind();

    this.element = null;
    this.expression = null;
    this.context = null;
    this.valueFn = null;
};

module.exports = Directive;

},{"../parse/expr":16}],11:[function(require,module,exports){
'use strict';

var Directive = require('./directive');

function EventDirective(options) {

    if(options && options.key) {
        this.event = options.key;
    }

    Directive.call(this, options);

}

EventDirective.prototype = new Directive();

EventDirective.prototype.isPair = true;

EventDirective.prototype.bind = function() {
    var directive = this;
    Directive.prototype.bind.call(this, {
        isEvent: true,
        event: this.event
    });
    if(this.element) {
        // always offer $event
        this.element.addEventListener(this.event, function($event) {
            directive.valueFn($event);
        }, false);
    }
};

EventDirective.prototype.update = function() {};

module.exports = EventDirective;

},{"./directive":10}],12:[function(require,module,exports){
'use strict';

var Directive = require('./directive');

var setter = function(obj, path, newValue) {
    if (!obj || !path) {
        return;
    }
    var paths = path.split('.'),
        target = obj;
    for (var i = 0, j = paths.length; i < j; i++) {
        var subPath = paths[i],
            value = target[subPath];
        if (i === j - 1) {
            target[subPath] = newValue;
        } else {
            if (value) {
                target = value;
            }
            else {
                return;
            }
        }
    }
};

function ModelDirective(options) {
    Directive.call(this, options);
}

ModelDirective.prototype = new Directive();

ModelDirective.prototype.bind = function() {
    var directive = this;

    var element = directive.element;

    var listener = function() {
        if (element.type === 'checkbox') {
            setter(directive.context, directive.expression, element.checked);
        } else {
            setter(directive.context, directive.expression, element.value);
        }
    };

    Directive.prototype.bind.call(this, arguments);

    element.addEventListener('keyup', listener, false);
    element.addEventListener('change', listener, false);
};

ModelDirective.prototype.update = function() {
    var value = this.valueFn();
    var element = this.element;

    if (element) {
        if (element.type === 'checkbox') {
            value = !!value;
            if (element.checked !== value) {
                element.checked = value;
            }
        } else {
            if (element.value !== value) {
                element.value = value;
            }
        }
    }
};

module.exports = ModelDirective;

},{"./directive":10}],13:[function(require,module,exports){
/* jshint -W030*/
'use strict';

var Directive = require('./directive');
var compileExpr = require('../parse/expr').compile;

var reRepeatExpr = /^\s*([\d\w]+)\s+in\s+(\S+)(\s+track\s+by\s+(\S+))?\s*$/;

function newContext(context) {
    if (context.$extend) {
        return context.$extend();
    }
    var Empty = function() {};
    Empty.prototype = context;

    return new Empty();
}

function insertAfter(newChild, refElement) {
    if (refElement) {
        refElement.parentNode.insertBefore(newChild, refElement.nextSibling);
    }
}

function RepeatDirective(options) {
    Directive.call(this, options);
}

RepeatDirective.prototype = new Directive();

// handle current data and diff with lastMap
RepeatDirective.prototype.diff = function(current) {

    var nameOfKey = this.nameOfKey;
    var trackByFn = this.trackByFn;

    // hold all subContexts
    var currentMap = {};
    var prevContext = null;
    var subContext, item;
    var i, j;

    for (i = 0, j = current.length; i < j; i++) {
        item = current[i];

        subContext = newContext(this.context);
        subContext.$index = i;
        subContext.$prev = prevContext ? trackByFn.call(prevContext) : null;
        subContext[nameOfKey] = item;

        currentMap[trackByFn.call(subContext)] = subContext;

        prevContext = subContext;
    }

    var removed = [];
    var added = [];
    var moved = [];

    var lastMap = this.lastMap || {};

    for (var lastKey in lastMap) {
        if (lastMap.hasOwnProperty(lastKey)) {
            var lastContext = lastMap[lastKey];
            var currentContext = currentMap[lastKey];
            if (!currentContext) {
                removed.push(lastContext);
            } else if (currentContext && lastContext &&
                currentContext[nameOfKey] !== lastContext[nameOfKey]) { // when track by $index
                removed.push(lastContext);
                added.push(currentContext);
            }
        }
    }

    for (var currentKey in currentMap) {
        if (currentMap.hasOwnProperty(currentKey)) {
            var context = currentMap[currentKey];
            var prev = context.$prev;
            // if not exists in lastMap, treat it as newly added
            if (!lastMap[currentKey]) {
                added.push(context);

            // if exists in lastMap but $prev changes, push to moved
            } else if (lastMap[currentKey].$prev !== prev) {
                moved.push(context);
            }
        }
    }

    this.lastMap = currentMap;

    return {
        added: added,
        moved: moved,
        removed: removed
    };
};

RepeatDirective.prototype.patch = function(patch) {
    var itemElementMap = this.itemElementMap;
    if (!itemElementMap) {
        itemElementMap = this.itemElementMap = {};
    }

    var childTemplate = this.childTemplate;
    var trackByFn = this.trackByFn;
    var commentNode = this.refNode;

    var added = patch.added;
    var removed = patch.removed;
    var moved = patch.moved;

    // remove dom item
    removed.forEach(function(removeContext) {
        var key = trackByFn.apply(removeContext);
        var el = itemElementMap[key];
        if (el) {
            el.parentNode && el.parentNode.removeChild(el);
        }
        removeContext.$destroy && removeContext.$destroy();
        delete itemElementMap[key];
    });

    // insert newly added item
    added.forEach(function(newContext) {
        var compile = require('../compile');
        var element = childTemplate.cloneNode(true);

        compile(element, newContext);

        var prevKey = newContext.$prev;
        var refNode;
        // check not null or undefined
        /* jshint -W116 */
        if (prevKey != null) {
        /* jshint +W116 */
            refNode = itemElementMap[prevKey];
        } else {
            refNode = commentNode;
        }

        insertAfter(element, refNode);

        itemElementMap[trackByFn.call(newContext)] = element;
    });

    // move exists dom item
    moved.forEach(function(moveContext) {
        var key = trackByFn.apply(moveContext);
        var el = itemElementMap[key];
        if (!el) {
            throw new Error('Some error happen when hv-repeat#diff.');
        }

        var prevKey = moveContext.$prev;
        var refNode;

        if (prevKey) {
            refNode = itemElementMap[prevKey];
        } else {
            refNode = commentNode;
        }

        insertAfter(el, refNode);
    });
};

// update repeat doms
RepeatDirective.prototype.update = function() {
    var array = this.valueFn() || [];

    var patches = this.diff(array);
    this.patch(patches);
};

// parse repeat expression
// the expression would be like: item in list
RepeatDirective.prototype.parseRepeatExpr = function() {
    var definition = this.expression;
    var nameOfKey;
    var valueExpression;
    var trackByExpression;

    var matches = reRepeatExpr.exec(definition);

    if (!matches) {
        throw 'Invalid expression of hy-repeat: ' + definition;
    }

    nameOfKey = matches[1];
    valueExpression = matches[2];
    trackByExpression = matches[4];

    if (trackByExpression === undefined) {
        trackByExpression = '$index';
    }

    this.nameOfKey = nameOfKey;
    this.trackByFn = compileExpr(trackByExpression);
    this.valueFn = compileExpr(valueExpression, this.context);
};

RepeatDirective.prototype.bind = function() {
    this.parseRepeatExpr();

    var array = this.valueFn() || [];
    var element = this.element;
    // init childTemplate
    var childTemplate = element.cloneNode(true);
    childTemplate.removeAttribute('hy-repeat');
    this.childTemplate = childTemplate;

    // add commentNode and remove element
    var refNode = this.refNode = document.createComment('hy-repeat: ' + this.expression);
    element.parentNode.insertBefore(refNode, element);
    element.parentNode && element.parentNode.removeChild(element);

    this.update();

    Object.observe(array, function() {
        this.update();
    }.bind(this));
};

module.exports = RepeatDirective;

},{"../compile":6,"../parse/expr":16,"./directive":10}],14:[function(require,module,exports){
'use strict';

var Directive = require('./directive.js');

function TextDirective(options) {
    Directive.call(this, options);
}

TextDirective.prototype = new Directive();

TextDirective.prototype.update = function() {
    var text = this.valueFn();
    if (text !== undefined && text !== null) {
        text = '' + text;
    } else {
        text = '';
    }

    var element = this.element;
    if (element.nodeType === 3) {
        this.element.nodeValue = text;
    } else if (element.nodeType === 1) {
        this.element.innerText = text;
    }
};

module.exports = TextDirective;

},{"./directive.js":10}],15:[function(require,module,exports){
var compile = require('./compile');

// exports compile
window.$compile = compile;
},{"./compile":6}],16:[function(require,module,exports){
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

},{"jsep":2}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
'use strict';

var observed = require('observed');

var ViewModel = function(model) {
    if (!model) {
        return;
    }

    var callbackMap = {};
    var observer = observed(model);
    var emptyArray = [];

    // register callback to property
    model.$watch = function(path, callback) {
        var callbacks = callbackMap[path];
        if (!callbacks) {
            callbacks = callbackMap[path] = [];
        }
        callbacks.push(callback);
    };

    // unregister callback
    model.$unwatch = function(path, callback) {
        var callbacks = callbackMap[path];
        if (callbacks) {
            if (callback) {
                for (var i = 0, j = callbacks.length; i < j; i++) {
                    if (callback === callbacks[i]) {
                        callbacks.splice(i, 1);
                        break;
                    }
                }
            } else {
                callbackMap[path] = [];
            }
        }
    };

    // 
    model.$extend = function() {
        /* jshint -W064 */
        return ViewModel(Object.create(this));
        /* jshint +W064 */
    };

    model.$destroy = function() {
        for (var path in callbackMap) {
            if (callbackMap.hasOwnProperty(path)) {
                var callbacks = callbackMap[path] || emptyArray;

                for (var i = 0, j = callbacks.length; i < j; i++) {
                    var callback = callbacks[i];
                    if (typeof callback === 'object' && callback.destroy) {
                        callback.destroy();
                    }
                }
            }
        }

        callbackMap = {};
    };

    observer.on('changed', function(change) {
        var path = change.path;
        if (path && path.charAt(0) === '$') {
            return;
        }

        var callbacks = callbackMap[path] || emptyArray;

        for (var i = 0, j = callbacks.length; i < j; i++) {
            var callback = callbacks[i];
            if (typeof callback === 'object' && callback.update) {
                callback.update();
            } else if (typeof callback === 'function') {
                callback(change);
            }
        }
    });

    return model;
};

module.exports = ViewModel;

},{"observed":4}]},{},[15])


//# sourceMappingURL=chay.js.map