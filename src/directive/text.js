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
