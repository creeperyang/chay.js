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
