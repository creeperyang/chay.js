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
