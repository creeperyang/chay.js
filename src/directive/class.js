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
