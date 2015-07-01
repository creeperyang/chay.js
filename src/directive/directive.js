'use strict';

var expr = require('../parse/expr');
var compileExpr = expr.compile;
var getDepends = expr.getDepends;

function Directive(options) {
    options = options || {};
    this.element = options.element;
    this.expression = options.expression;
    this.context = options.context;

    this.bind();
}

Directive.prototype.bind = function() {
    var directive = this;
    if (directive.element && directive.expression && directive.context) {
        directive.valueFn = compileExpr(directive.expression, directive.context);

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
