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
    Directive.prototype.bind.call(this);
    if(this.element) {
        this.element.addEventListener(this.event, this.valueFn, false);
    }
};

EventDirective.prototype.update = function() {};

module.exports = EventDirective;
