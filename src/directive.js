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
