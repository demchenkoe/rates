/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 16.02.16.
 * License BSD
 */
'use strict';

(function(window, $) {

  /**
   * Rates model based on Observer.
   * Values will be auto refresh by event from server.
   *
   * @example:
   *  var ratesModel = RatesModel();
   *  ratesModel.$observe(function(obEv) {
   *    console.log('Rate changes, pair=%s, new value=%s', obEv.name, obEv.newValue);
   *  });
   *
   *  ratesModel.add('eurusd');
   *  ratesModel.add('eurrub');
   */

  var RatesModel = $.class('RatesModel', $.Observer, {

    initialize: function (obSettings, obSymbols) {
      $.Observer.prototype.initialize.apply(this);
      this.connection = io('prices-server-mock.dmitrypodgorniy.com');
      this.connection.on('connect', this.onConnect.bind(this));
      this.connection.on('price-change', this.onPriceChange.bind(this));
      this.$observe(this.onObserveEvent, this);
      this.uids = {/* <pair>: <uid> */};
    },
    subscribe: function (pair) {
      if (this.connection && typeof this.uids[pair] === 'undefined') {
        this.connection.emit('subscribe-req', {
          pair: pair,
          uid: (this.uids[pair] = Math.random())
        });
      }
    },
    unsubscribe: function (pair) {
      if (this.connection && typeof this.uids[pair] !== 'undefined') {
        this.connection.emit('unsubscribe-req', {
          pair: pair,
          uid: this.uids[pair]
        });
      }
    },
    onConnect: function (connection) {
      //subscribe for all our pairs changes
      for (var k in this.$values) {
        if (!this.$values.hasOwnProperty(k)) {
          continue;
        }
        this.subscribe(k);
      }
    },
    onObserveEvent: function (obEv) {
      switch (obEv.type) {
        case "add":
          this.subscribe(obEv.name);
          break;
        case "delete":
          this.unsubscribe(obEv.name);
          break;
      }
    },
    onPriceChange: function (data) {
      this.set(data.pair, data.price);
    }
  });

  /**
   *  directive for symbols block
   *  @example:
   *    <div add-symbols=""></div>
   */

  $.directive('addSymbols', function (scope, $elem, attrs, key) {
    var $btnElem = $.element($elem.findOne('button'));

    //bind event handlers

    scope.$observe(['symbol1', 'symbol2', 'preDefinedSymbols'], function (obEv) {
      console.log('observer', obEv);
      if (obEv.type === 'add') {
        return;
      }
      var disable = !scope.symbol1 || !scope.symbol2;
      if (!disable) {
        disable = scope.symbol1 === scope.symbol2;
      }
      if (!disable) {
        var id = (scope.symbol1 + scope.symbol2);
        disable = scope.symbol1 === scope.symbol2 ||
          $.filter(scope.preDefinedSymbols, function (v) {
            return v === id;
          }).length > 0;
        console.log('id', id);
      }
      $btnElem.disabled(disable);
    });

    $btnElem.on('click', function (ev) {
      if ($btnElem.attr('disabled')) {
        return;
      }
      var pairs = [scope.symbol1, scope.symbol2];
      scope.symbols.push({id: pairs.join(''), pairs: pairs});
    });

    //setup current values (our event handlers will be triggered on this setup)

    setTimeout(function () {
      scope.add('symbol1', scope.currencies[0]);
      scope.add('symbol2', scope.currencies[0]);
    });
  });


  /**
   * main controller
   * @example:
   *  <div controller="mainCtrl"></div>
   */

  $.controller('mainCtrl', function (scope) {

    //initialize our scope and models

    scope.add('refreshPeriod', 10);
    scope.add('currencies', ['usd', 'eur', 'rub', 'jpy', 'gbp', 'cad']);
    scope.add('preDefinedSymbols', [
      {id: 'eurusd', pairs: ['eur', 'usd']},
      {id: 'eurgpb', pairs: ['eur', 'gpb']},
      {id: 'eurrub', pairs: ['eur', 'rub']}
    ]);

    var ratesModel = new RatesModel();

    /*scope.add('rates', $.scope([
      {id: 'EURUSD', pairs: ['eur', 'usd']},
      {id: 'EURGPB', pairs: ['eur', 'gpb']},
      {id: 'EURRUB', pairs: ['eur', 'rub']}
    ], {$parent: scope}));*/

    //handlers for buttons clicks

    scope.add('addRate', function (symbol1, symbol2) {
      var pairs = [symbol1, symbol2];
      var id = pairs.join('').toLowerCase();
      ratesModel.add(id);
      scope.rates.push({id: pairs.join('').toUpperCase(), pairs: pairs});
    });

    scope.add('removeRate', function (symbolId) {
      var index = $.findIndex(scope.rates, function (v) {
        return v.id === symbolId;
      });
      if (index !== null) {
        scope.rates.splice(index, 1);
      }
    });

    //refresh data with "refreshPeriod"

    var refreshTimer = null;
    var refreshFn = function () {
      console.log('refresh', Date.now());
    };
    scope.$observe('refreshPeriod', function (obEv) {
      if (obEv.type !== 'update') return;
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
      refreshTimer = setInterval(refreshFn, obEv.newValue * 1);
    });

  });


  window.onload = function () {
    $.compile();
  };
})(window, window.myFramework);