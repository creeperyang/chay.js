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
