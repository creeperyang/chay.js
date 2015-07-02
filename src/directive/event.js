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
