/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 06.02.16.
 * License BSD
 */
'use strict';

(function (root, window) {

  var $ = {};

  /*
   * JS helpers
   */

  $.isArray = function (v) {
    return Array.isArray(v);
  };

  $.isObject = function (v) {
    return typeof v === 'object' && v !== null && !$.isArray(v);
  };

  $.extend = function (dst, obj1 /* ..., objN */) {
    dst || (dst = {});
    for (var i = 0; i < arguments.length; i++) {
      var src = arguments[i];
      for (var k in src) {
        if (!src.hasOwnProperty(k)) {
          continue;
        }
        dst[k] = src[k];
      }
    }
    return dst;
  };

  $.keys = function (v) {
    var r = [];
    if ($.isArray(v) || $.isObject(v)) {
      for (var k in v) {
        if (v.hasOwnProperty(k)) {
          r.push(k);
        }
      }
    }
    return r;
  };

  $.values = function (v) {
    if($.isArray(v)) {
      return v;
    }
    var r = [];
    if ($.isObject(v)) {
      for (var k in v) {
        if (v.hasOwnProperty(k)) {
          r.push(k);
        }
      }
    }
    return r;
  };

  $.size = function (v) {
    if ($.isArray(v)) {
      return v.length;
    }
    if ($.isObject(v)) {
      var r = 0;
      for (var k in v) {
        if (v.hasOwnProperty(k)) {
          r++;
        }
      }
      return r;
    }
    return 0;
  };

  $.map = function (v, fn) {
    var r = [];
    if ($.isArray(v) || $.isObject(v)) {
      for (var k in v) {
        if (!v.hasOwnProperty(k)) {
          continue;
        }
        r.push(fn(v[k], k));
      }
    }
    return r;
  };

  $.filter = function (v, fn) {
    var isArray = $.isArray(v), r = isArray ? [] : {};
    if (isArray || $.isObject(v)) {
      for (var k in v) {
        if (!v.hasOwnProperty(k) || !fn(v[k], k)) {
          continue;
        }
        isArray ? r.push(v[k]) : (r[k] = v[k]);
      }
    }
    return r;
  };

  $.findIndex = function (v, fn) {
    if ($.isArray(v) || $.isObject(v)) {
      for (var k in v) {
        if (!v.hasOwnProperty(k) || !fn(v[k], k)) {
          continue;
        }
        return k;
      }
    }
    return null;
  };

  $.bind = function (fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    }
  };


  $.addEventListener = function(elem, evName, cb, useCapture) {

    if (typeof elem.addEventListener === 'function') {
      elem.addEventListener(evName, cb, useCapture);
    } else if (typeof elem.attachEvent === 'function') {
      elem.attachEvent('on'+evName, function(e) {
        cb(e || window.event);
      });
    }
  };

  /*
   * Helpers for convert strings  'abc-def' to 'abcDef' and to back
   */

  var camelCaseRegExp = /\-(\w)/;
  var hyphenCaseRegExp = /([A-Z])/;

  $.toCamelCase = function (str) {
    return str.replace(camelCaseRegExp, function (s, p1) {
      return p1.toUpperCase();
    });
  };

  $.toDashCase = function (str) {
    return str.replace(hyphenCaseRegExp, function (s, p1) {
      return '-' + p1.toLowerCase();
    });
  };


  /**
   * Class
   * Helper for inheritable classes
   */

  $.class = function (name, parent, prototype, _static) {
    var _class = new Function('return function ' + name + '(){ this.initialize.apply(this, arguments); }')();
    _class.prototype.initialize = function () {
    };
    var prototypes = [_class.prototype];
    if (typeof parent === 'function') {
      prototypes.push(parent.prototype);
    }
    if (prototype) {
      prototypes.push(prototype);
    }
    $.extend.apply($, prototypes);
    if (_static && typeof _static === 'object') {
      $.extend(_class, _static);
    }
    return _class;
  };

  /**
   * Events
   * standart methods on/off/trigger for event supply
   */

  $.Events = $.class('Events', null, {
    initialize: function () {
      this.$cbs = {};
    },
    on: function (evName, fn, thisArg) {
      var arr = this.$cbs[evName] || (this.$cbs[evName] = []);
      arr.push({fn: fn, thisArg: thisArg});
    },
    _off: function (arr, fn, thisArg) {
      for (var i = 0; i < arr.length; i++) {
        var del = true;
        if (fn && arr[i].fn !== fn) {
          del = false;
        }
        if (thisArg && thisArg[i].thisArg !== thisArg) {
          del = false;
        }
        if (del) {
          arr.splice(i, 1);
          i--;
        }
      }
    },
    /**
     *  Unbind event handler. All arguments is optional.
     */
    off: function (evName, fn, thisArg) {
      if (evName) {
        if (fn || thisArg) {
          this._off(this.$cbs[evName], fn, thisArg);
        } else {
          delete this.$cbs[evName];
        }
        return;
      }
      for (var k in this.$cbs) {
        if (!this.$cbs.hasOwnProperty(k)) continue;
        this._off(this.$cbs[k], fn, thisArg);
      }
    },
    trigger: function (evNames, arg1/*, ..., argN */) {
      if (!Array.isArray(evNames)) {
        evNames = [evNames];
      }
      for (var n = 0; n < evNames.length; n++) {
        var evName = evNames[n];
        var arr = this.$cbs[evName];
        if (!arr) {
          continue;
        }
        var args = Array.prototype.splice.call(arguments, 1);
        for (var i = 0; arr && i < arr.length; i++) {
          try {
            arr[i].fn.apply(arr[i].thisArg || root, args);
          } catch (e) {
            console.error(e);
          }
        }

      }
    }
  });

  /**
   *  Observer
   */

  $.Observer = $.class('Observer', $.Events, {
    initialize: function (obj, options) {
      $.Events.prototype.initialize.call(this);
      this.$options = options || (options = {});
      this.$options.isArray || (this.$options.isArray = $.isArray(obj));
      this.$values = this.$options.isArray ? [] : {};
      if(this.$options.$parent) {
        this.$values.$parent = this.$options.$parent;
      }
      if ($.isArray(obj) || $.isObject(obj)) {
        this.addBulk(obj);
      }
    },
    _defineProperty: function(name) {
      if(typeof this[name] !== 'undefined') {
        return;
      }
      var self = this;
      Object.defineProperty(this, name, {
        configurable: true,
        enumerable: true,
        get: function () {
          return self.get(name);
        },
        set: function (val) {
          return self.set(name, val);
        }
      });
    },
    isArray: function() {
      return this.$options.isArray;
    },
    get: function (name, options) {
      options || (options = {});
      var val, parts;
      if( (typeof name === 'string') && (parts = name.split('.', 2)) && (parts.length > 1) ) {
        val = this.$values[parts[0]][parts[1]];
      } else {
        val = this.$values[name];
      }
      if(typeof val === 'undefined' && typeof options.default !== 'undefined') {
        return options.default;
      }
      return val;
    },
    set: function (name, val, options) {
      options || (options = {});
      if(!this.hasOwnProperty(name)) {
        return this.add(name, val, options);
      }
      var oldVal = this.$values[name];
      if(oldVal === val && !options.force) {
        return;
      }
      this.$values[name] = val;

      var payload = {
        name: name,
        object: this,
        type: 'update',
        newValue: val,
        oldValue: oldVal
      };

      this.trigger(['$observe', '$observe.' + name], payload);
      if(this.$values.$parent && this.$values.$parent.trigger) {
        this.$values.$parent.trigger(['$observe.$child'], payload);
      }
    },
    del: function (name) {
      if (this.$options.isArray) {
        return this.splice(name, 1);
      }
      var oldVal = this.$values[name];
      delete this.$values[name];
      delete this[name];
      var payload = {
        name: name,
        object: this,
        type: 'delete',
        oldValue: oldVal
      };
      this.trigger(['$observe', '$observe.' + name], payload);
      if(this.$values.$parent && this.$values.$parent.trigger) {
        this.$values.$parent.trigger(['$observe.$child'], payload);
      }
    },
    add: function (name, val, options) {
      var self = this;

      if (this.$options.isArray) {
        //this is array
        if (options && options.method === 'unshift') {
          name = this.$values.unshift(val)-1;
        } else {
          name = this.$values.push(val)-1;
        }
      }

      if (this.$options.isArray || !this.$values.hasOwnProperty(name) ) {
        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          get: function () {
            return self.get(name);
          },
          set: function (val) {
            return self.set(name, val);
          }
        });
        var payload = {
          name: name,
          object: this,
          type: 'add',
          newValue: val
        };
        this.trigger(['$observe', '$observe.' + name], payload);
        if(this.$values.$parent && this.$values.$parent.trigger) {
          this.$values.$parent.trigger(['$observe.$child'], payload);
        }
      }

      if (!this.$options.isArray) {
        //this is object
        if (this.$values.hasOwnProperty(name)) {
          if (typeof val !== 'undefined') {
            this.set(name, val);
          }
          return;
        }
        if (typeof val !== 'undefined') {
          this.set(name, val);
        }
      }
      return name;
    },
    push: function (val) {
      this.add(null, val, { method: 'push' });
      return this.$values.length;
    },
    pop: function () {
      if(this.$values.length) {
        var index = this.$values.length-1;
        var val = this.$values[index];
        this.splice(index, 1);
        return val;
      }
    },
    unshift: function (val) {
      this.add(null, val, { method: 'unshift'});
      return this.$values.length;
    },
    shift: function () {
      if(this.$values.length) {
        var index = 0;
        var val = this.$values[index];
        this.splice(index, 1);
        return val;
      }
    },
    splice: function (start, deleteCount/*, item1, ..., itemN */) {
      var oldLength = this.$values.length;
      var removed = Array.prototype.splice.apply(this.$values, arguments);
      var newLength = this.$values.length;
      if(newLength > oldLength) {
        for(var i=oldLength; i< newLength; i++) {
          this._defineProperty(i);
        }
      } else
      if(newLength < oldLength) {
        for(var i=oldLength; i> newLength; i--) {
          delete this[i-1];
        }
      }
      var payload = {
        object: this,
        type: 'splice',
        removed: removed,
        addedCount: arguments.length - 2
      };
      this.trigger(['$observe'], payload);
      if(this.$values.$parent && this.$values.$parent.trigger) {
        this.$values.$parent.trigger(['$observe.$child'], payload);
      }
      return removed;
    },
    addBulk: function (obj, options) {
      if(options && typeof options.transform === 'function') {
        obj = $.map(obj, options.transform);
      }
      if(this.$options.isArray) {
        this.splice.apply(this, [this.$values.length, 0].concat( $.values(obj) ));
        return;
      }
      for (var k in obj) {
        if (!obj.hasOwnProperty(k)) {
          continue;
        }
        this.add(k, obj[k]);
      }
    },
    $observe: function (name, cb, thisArg) {
      if (typeof name === 'function') {
        thisArg = cb;
        cb = name;
        name = null;
      }
      if ($.isArray(name)) {
        for(var i=0; i<name.length; i++) {
          this.$observe(name[i], cb);
        }
        return;
      }
      if(typeof name === 'string') {
        //add support for objects hierarchy
        var parts = name.split('.', 2);
        if( parts.length > 1 ) {
          var subObject = this.$values[parts[0]];
          if(!subObject) {
            console.error('$observe error. name=%s, subObject not found.', name);
            return;
          }
          if(typeof subObject.$observe === 'function') {
            subObject.$observe(parts[1], cb);
          }/* else { some objects can be unobserve
            console.error('$observe error. name=%s, subObject is not valid $observeable object.', name);
          }*/
          return;
        }
      }
      this.on('$observe' + (typeof name === 'string' ? '.' + name : ''), cb, thisArg);
    },
    getObject: function() {
      if( this.$options.isArray ) {
        return this.$values.splice(0);
      }
      return $.filter(this.$values, function(v, k) {
        return k.indexOf('$') !== 0;
      });
    }
  });

  /**
   * Scope
   */

  $.Scope = $.class('Scope', $.Observer, {
    initialize: function (obj, options) {
      $.Observer.prototype.initialize.call(this, obj, options);
    }
  }, {
    getScopeForElement: function (element) {
      if (!element) {
        return null;
      }
      if (element.hasOwnProperty('_element')) {
        element = element._element;
      }
      while (element && !element.$scope) {
        element = element.parentElement;
      }
      return element && element.$scope ? element.$scope : null;
    },

    generateFunction: function(body) {
      return Function('scope', 'with(scope){' + body + '}');
    }
  });

  $.scope = function(obj, options) {
    return new $.Scope(obj, options);
  };

  /**
   * Wrapper to native Element
   */

  $.Element = $.class('Element', $.Events, {
    initialize: function (element) {
      $.Events.prototype.initialize.call(this);
      this._element = element;
      element.$element = this;
    },

    attrs: function (keys) {
      var obj = {};
      for (var i = 0; i < this._element.attributes.length; i++) {
        var attr = this._element.attributes[i];
        var attrName = this._element.attributes[i].name;
        if (keys && keys.indexOf(attrName) === -1) {
          continue;
        }
        obj[attrName] = attr.value;
      }
      return obj;
    },
    attr: function (name, val) {
      if (typeof val !== 'undefined') {
        this._element.setAttribute(name, val);
      } else {
        return this._element.getAttribute(name, val);
      }
    },
    val: function (val) {
      if (typeof val !== 'undefined') {
        this._element.value = val;
      } else {
        return this._element.value;
      }
    },
    text: function (val) {
      if (typeof val !== 'undefined') {
        this._element.textContent = val;
      } else {
        return this._element.textContent;
      }
    },
    html: function (val) {
      if (typeof val !== 'undefined') {
        this._element.innerHTML = val;
      } else {
        return this._element.innerHTML;
      }
    },
    disabled: function(isDisabled) {
      this._element[isDisabled ? 'setAttribute':'removeAttribute']('disabled', 'disabled');
    },
    clone: function () {
      return this._element.cloneNode(true);
    },
    insertBefore: function (newElem) {
      return this._element.parentElement.insertBefore(newElem._element || newElem, this._element);
    },
    detach: function () {
      return this._element.parentElement.removeChild(this._element);
    },
    closest: function (selector) {
      return this._element.closest(selector);
    },
    remove: function() {
      return this._element.parentElement.removeChild(this._element);
    },
    findOne: function(selector) {
      return this._element.querySelector(selector);
    },
    find: function(selector) {
      return this._element.querySelectorAll(selector);
    },

    /*
     *  merge $.Events and native Element events functional
     */

    on: function (evName, fn, thisArg) {
      $.Events.prototype.on.apply(this, arguments);

      var origHandler = null,
        fullEvName = 'on' + evName,
        self = this;

      if (typeof this._element[fullEvName] !== 'undefined') {
        origHandler = this._element[fullEvName];
        //we always setup proxyEvent.originalHandler
        //check it for determine our handler
        if (origHandler && typeof origHandler.originalHandler !== 'undefined') {
          //already setup proxyEvent
          return;
        }
      }
      var proxyEvent = function (ev) {
        self.trigger.call(self, evName, ev);
        if (typeof origHandler === 'function') {
          origHandler.apply(this, arguments);
        }
      };
      proxyEvent.originalHandler = origHandler;
      this._element[fullEvName] = proxyEvent;
    },
    off: function (evName, fn, thisArg) {
      $.Events.prototype.off.apply(this, arguments);
      if (!this.$cbs.hasOwnProperty(evName) || !this.$cbs[evName].length) {

        //We not have more subscribers.
        //Poweroff proxyEvent handler.

        var fullEvName = 'on' + evName;
        if (typeof this._element[fullEvName] !== 'undefined') {
          var proxyEvent = this._element[fullEvName];
          //we always setup proxyEvent.originalHandler
          //check it for determine our handler
          if (typeof proxyEvent.originalHandler !== 'undefined') {
            this._element[fullEvName] = proxyEvent.originalHandler;
          }
        }
      }
    }
  });

  $.element = function(element){
    if(element && element._element) {
      return element;
    }
    if(element.$element) {
      return element.$element;
    }
    return new $.Element(element);
  };

  /**
   * Controller
   */

  $.Controller = $.class('Controller', null, {
    initialize: function (element) {
      this.parent = $.Scope.getScopeForElement(element);
      this.scope = element.$scope = new $.Scope({ $parent: this.parent });
      this.handler(this.scope);
    },
    handler: function (scope) {
    }
  }, {
    _controllers: {},
    add: function (name, ctrl) {
      $.Controller._controllers[name] = ctrl;
    },
    get: function (name) {
      return $.Controller._controllers[name];
    }
  });

  /**
   * Helper for create new controllers
   * @param name
   * @param handler
   */

  $.controller = function (name, handler) {
    var ctrl = $.class(name, $.Controller, {
      handler: handler
    });
    $.Controller.add(name, ctrl);
  };

  /**
   * Directive
   */

  $.Directive = $.class('Directive', null, {
    name: '',
    initialize: function (options) {
      this.options = $.extend({}, options);
    },
    /**
     * use when need manipulate with DOM (as example, insert new elements in directive ob-repeat)
     * @param scope
     * @param element
     * @param attrs
     * @param paramStr
     */
    buildDom: function (scope, element, attrs, paramStr) {
    },
    /**
     * link directive handlers to element
     * @param scope
     * @param element
     * @param attrs
     * @param paramStr
     */
    link: function (scope, element, attrs, paramStr) {
    }
  }, {
    _directives: {},
    add: function (name, ctrl) {
      $.Directive._directives[name] = ctrl;
    },
    get: function (name) {
      return $.Directive._directives[name];
    }
  });

  /**
   * Helper for create new directive
   * @param name
   * @param handler
   */

  $.directive = function (name, link, buildDom) {
    var prototype = {
      name: name
    };
    if (link && typeof link === 'object') {
      prototype = $.extend({}, link, {name: name});
    } else {
      if (typeof link === 'function') {
        prototype.link = link;
      }
      if (typeof buildDom === 'function') {
        prototype.buildDom = buildDom;
      }
    }
    $.Directive.add(name, $.class(name, $.Directive, prototype));
  };

  /**
   * Generic directives
   */

  $.directive('scopeValue', function (scope, $elem, attrs, key) {
    $elem.val(scope[key]);
    scope.$observe(key, function (info) {
      $elem.val(info.newValue);
    });
    $elem.on('change', function () {
      scope[key] = $elem.val();
    });

  });

  $.directive('scopeText', function (scope, $elem, attrs, key) {
    $elem.text(scope.get(key));
    scope.$observe(key, function (info) {
      $elem.text(info.newValue);
    });
  });

  $.directive('scopeHtml', function (scope, $elem, attrs, key) {
    $elem.html(scope.key);
    scope.$observe(key, function (info) {
      $elem.html(info.newValue);
    });
  });

  $.directive('scopeRepeat', {
    _paramsRegExp: {
      // (key, value) in items
      keyVal: /\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*in\s+(\w+)/,
      // value in items
      val: /\s*(\w+)\s+in\s+(\w+)/,
    },
    _parseParamStr: function() {
      var parsed;
      if(parsed = this._paramsRegExp.keyVal.exec(this.options.paramStr)) {
        this.params = {
          source: parsed[3],
          keyVarName: parsed[1],
          valVarName: parsed[2]
        }
      }
      else if(parsed = this._paramsRegExp.val.exec(this.options.paramStr)) {
        this.params = {
          source: parsed[2],
          valVarName: parsed[1]
        }
      } else {
        this.params = {
          source: this.options.paramStr,
          valVarName: 'item'
        }
      }
    },
    _migrateElementToCommentNodes: function () {
      this._parent = this.options.$elem._element.parentElement;

      //insert comments

      this._commentNodeBefore = document.createComment('scope-repeat=' + this.options.paramStr);
      this.options.$elem.insertBefore(this._commentNodeBefore);
      this._commentNodeBefore._directive = this;

      this._commentNodeAfter = document.createComment('/scope-repeat=' + this.options.paramStr);
      this.options.$elem.insertBefore(this._commentNodeAfter);
      this._commentNodeAfter._directive = this;

      //detach original element from DOM
      this._originalElement = this.options.$elem.detach();

      //remove attribute "scope-repeat" because original element
      //will use as template for new elements

      this._originalElement.removeAttribute('scope-repeat');
    },

    /**
     * find refElement for insertBefore and setup new value $index for exists elements
     */

    _getRefElementAndNormaliseIndex: function(startIndex, elementCount) {
      var refElem = this._commentNodeAfter;
      var elem = this._commentNodeBefore;
      var index = -1, newIndex = -1;
      while( (elem = elem.nextSibling) && elem !== this._commentNodeAfter) {
        if(++index === startIndex) {
          refElem = elem;
          newIndex+= elementCount;
        }
        elem.$scope.$index = ++newIndex;
      }

      return refElem;
    },
    _insertElement: function (elem, scope, refElem) {
      refElem || (refElem = this._commentNodeAfter);
      refElem.parentNode.insertBefore(elem, refElem);
      elem.$scope = scope;
    },
    _insertAllElements: function (items, startIndex) {
      var $index = startIndex;
      var elementCount = $.size(items);
      if(!elementCount) return;
      var refElem = this._getRefElementAndNormaliseIndex(startIndex, elementCount);
      for (var k in items) {
        if (!items.hasOwnProperty(k) || (typeof k==='string' && k.indexOf('$') === 0) ) {
          continue;
        }
        var obj = {
          $index: $index++,
          $parent: this.options.scope
        };
        if(this.params.keyVarName) {
          obj[this.params.keyVarName] = k;
        }
        if(this.params.valVarName) {
          obj[this.params.valVarName] = items[k];
        }
        this._insertElement(
          this._originalElement.cloneNode(true),
          new $.Scope(obj),
          refElem
        );
      }
    },
    _deleteAllElements: function() {
      var elem;
      while( (elem = this._commentNodeBefore) && elem.nextSibling !== this._commentNodeAfter) {
        $.element(elem.nextSibling).remove()
      }
    },
    buildDom: function (scope, $elem, attrs, paramStr) {
      this._parseParamStr();

      //first initialize

      this._migrateElementToCommentNodes();

      var source = scope[this.params.source];
      if (source && $.size(source)) {
        this._insertAllElements(source, 0);
      }

      //watch changes
      var self = this;
      var obHandler = function (obEv, options) {
        options || (options = {});
        //this is simple code.
        //because this is demo
        self._deleteAllElements();
        self._insertAllElements(options.isChild ? obEv.object : obEv.newValue);
        $.compile(self._parent, scope);
      };

      scope.$observe(this.params.source, obHandler);
      scope.$observe('$child', function(obEv) {
        if(obEv.object === scope[self.params.source]) {
          obHandler(obEv, { isChild: true });
        }
      });

    }
  });


  $.directive('onEvent', function (scope, $elem, attrs, paramStr) {
    var parts = paramStr.split(':', 2);
    if(parts.length !== 2) {
      console.log('Directive onEvent error. You must define attribute as  on-event="<eventName>:<handler>"');
      return;
    }
    $elem.on(parts[0], function(ev) {
      var fn = scope.get(parts[1]);
      if(typeof fn === 'function') {
        fn(ev);
      }
    });
  });

  $.directive('onClick', function (scope, $elem, attrs, paramStr) {
    var fn = $.Scope.generateFunction(paramStr);
    $elem.on('click', function onClick(ev) {
      if( $elem.attr('disabled') ) {
        return;
      }
      var scope = $.Scope.getScopeForElement($elem);
      fn(scope);
    });
  });


  /**
   * Scan DOM and run controllers and directives
   */

  $.Compiller = $.class('Compiller', null, {
    initialize: function (options) {
      var self = this;
      this.rootNode = options.rootNode || document;
      this.scope = options.scope || new $.Scope();
      this.Controllers = options.Controllers;
      this.Directives = options.Directives;
      this._allDirectives = $.Directive._directives;
      this._bindControllers();
      this._runBuildDomDirectives();
      this._runLinkDirectives();
    },
    _bindControllers: function () {
      var ctrlElems = this.rootNode.querySelectorAll('[controller]');
      for (var i = 0; i < ctrlElems.length; i++) {
        var ctrlElem = ctrlElems[i];
        var ctlrName = ctrlElem.attributes.controller.value;
        var ctrlClass = $.Controller.get(ctlrName);
        new ctrlClass(ctrlElem);
      }
    },
    _runBuildDomDirectives: function () {
      var selectors = [];
      var Directives = $.filter(this.Directives, function (v, name) {
        if (v.prototype.hasOwnProperty('buildDom')) {
          selectors.push('[' + $.toDashCase(name) + ']')
          return true;
        }
        return false;
      });
      var elems = this.rootNode.querySelectorAll(selectors.join(','));
      for (var n = 0; n < elems.length; n++) {
        var directives = this._factoryDirectivesForElement(elems[n], Directives)
        for (var i = 0; i < directives.length; i++) {
          var options = directives[i].options;
          directives[i].buildDom(options.scope, options.$elem, options.attrs, options.paramStr);
        }
      }
    },
    _runLinkDirectives: function () {
      var selectors = [];
      var Directives = $.filter(this.Directives, function (v, name) {
        if (v.prototype.hasOwnProperty('link')) {
          selectors.push('[' + $.toDashCase(name) + ']')
          return true;
        }
        return false;
      });
      var elems = this.rootNode.querySelectorAll(selectors.join(','));
      for (var n = 0; n < elems.length; n++) {
        var directives = this._factoryDirectivesForElement(elems[n], Directives);
        for (var i = 0; i < directives.length; i++) {
          var options = directives[i].options;
          directives[i].link(options.scope, options.$elem, options.attrs, options.paramStr);
        }
      }
    },
    _getScopeForElement: function ($elem) {
      return $.Scope.getScopeForElement($elem);
    },
    _factoryDirectivesForElement: function (elem, Directives) {
      var arr = [];
      var $elem = $.element(elem);
      var scope = this._getScopeForElement($elem);
      if (!scope) {
        return arr;
      }
      var attrs = $elem.attrs();

      for (var k in attrs) {
        if (!attrs.hasOwnProperty(k)) {
          continue;
        }
        var dirName = $.toCamelCase(k);
        if (!Directives.hasOwnProperty(dirName)) {
          continue;
        }

        //factory directive if need

        var directives = elem._directives || (elem._directives = {});
        var directive = elem._directives[dirName] || null;
        if (!directive) {
          var Directive = Directives[dirName];
          directive = new Directive({
            scope: scope,
            $elem: $elem,
            attrs: attrs,
            paramStr: attrs[k]
          });
          directives[dirName] = directive;
        }

        arr.push(directive);
      }
      return arr;
    }
  });

  $.compile = function (rootNode, scope) {
    new $.Compiller({
      rootNode: rootNode,
      scope: scope,
      Controllers: $.Controller._controllers,
      Directives: $.Directive._directives
    });
  };

  $.Storage = $.class('Storage', $.Observer, {
    initialize: function() {
      $.Observer.prototype.initialize.apply(this);
      if(window['localStorage'] === 'undefined' || !window.localStorage ) {
        this.$storage = null;
        console.error('Your browser not support local storage. So your settings will not be saved.');
      } else {
        this.$storage = window.localStorage;
      }
      if(this.$storage) {
        var self = this;
        $.addEventListener(window, 'storage', function(storageEvent) {
          self.set(storageEvent.key, storageEvent.newValue, { storageEvent: storageEvent });
        });
      }
    },
    get: function(name, options) {
      if(this.$storage) {
        return  JSON.parse( this.$storage.getItem(name) );
      } else {
        return $.Observer.prototype.get.apply(this, arguments);
      }
    },
    set: function(name, val, options) {
      options || (options = {});
      if(this.$storage) {
        if(!options.storageEvent) {
          this.$storage.setItem(name, JSON.stringify(val) );
        }
      }
      $.Observer.prototype.set.call(this, name, val, options);
      return val;
    }
  });

  /**
   * Singleton localstorage factory
   */

  var storageInstance;
  $.storage = function() {
    return storageInstance || (storageInstance = new $.Storage())
  };

  /**
   * export my framework
   */
  root.myFramework = $;

})(window, window);