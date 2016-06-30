var whcyit = {
  ticket_expired: 'ticket-expired',
  emptyFunction: function () {
  },
  ionicConfig: function (ionicConfigProvider) {
    ionicConfigProvider.tabs.style('standard').position('bottom');
    ionicConfigProvider.navBar.alignTitle('center');
    ionicConfigProvider.backButton.previousTitleText(false);
  },
  hasProp: {}.hasOwnProperty,
  create: function () {
    var parent = null, properties = Array.prototype.slice.call(arguments, 0);
    if (angular.isFunction(properties[0])) {
      parent = properties.shift();
    }

    function klass() {
      this.init.apply(this, arguments);
    }

    if (parent) {
      whcyit._extend(klass, parent);
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      angular.extend(klass.prototype, properties[i]);
    }

    if (!klass.prototype.init) {
      klass.prototype.init = function () {
      };
    }

    klass.prototype.constructor = klass;
    return klass;
  },
  _extend: function (child, parent) {
    for (var key in parent) {
      if (whcyit.hasProp.call(parent, key)) {
        child[key] = parent[key];
      }
    }
    function ctor() {
      this.constructor = child;
    }

    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.$super = parent.prototype;

    return child;
  },
  // 日志
  log: function () {
    if (console && console.log) {
      console.log.apply(console, arguments);
    }
  },
  // 安全apply
  safeApply: function ($scope, fn) {
    var phase = ($scope.$root || $scope)['$$phase'];
    if (phase == '$apply' || phase == '$digest') {
      if (fn && (typeof (fn) === 'function')) {
        fn();
      }
    } else {
      $scope.$apply(fn);
    }
  },
  // 初始化绑定angular
  _initAngular: function (module, type, types, key, hasDepends) {
    if (!module[types]) {
      return this;
    }
    if (!key) {
      var me = this;
      angular.forEach(module[types], function (v, key) {
        if (key.indexOf('Abstract') == 0) {
          return;
        }

        me._initAngular(module, type, types, key, hasDepends);
      });
      return this;
    }
    var obj = module[types][key];
    if (hasDepends) {
      var constructor = obj.prototype['init'];
      if (constructor) {
        obj.depends = this.getParameterNames(constructor);
      }
      obj.withDepends = (obj.depends ? obj.depends.concat(obj) : [obj]);
      module[type](key, obj.withDepends);
    } else {
      module[type](key, obj);
    }
    return this;
  },
  COMMENTS: /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
  getParameterNames: function (fn) {
    var code = fn.toString().replace(this.COMMENTS, '');
    return code.slice(code.indexOf('(') + 1, code.indexOf(')')).match(/([^\s,]+)/g);
  },
  indexOfByProp: function (list, name, value) {
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i][name] == value) {
        idx = i;
        break;
      }
    }
    return idx;
  },
  removeByProp: function (list, name, value) {
    var pos = this.indexOfByProp(list, name, value);
    if (pos != -1) {
      list.splice(pos, 1);
    }
  },
  initProvider: function (module, key) {
    return this._initAngular(module, 'provider', 'providers', key, false);
  },
  initService: function (module, key) {
    return this._initAngular(module, 'service', 'services', key, true);
  },
  initController: function (module, key) {
    return this._initAngular(module, 'controller', 'controllers', key, true);
  },
  initDirective: function (module, key) {
    return this._initAngular(module, 'directive', 'directivies', key, false);
  },
  initFilter: function (module, key) {
    return this._initAngular(module, 'filter', 'filters', key, false);
  },
  initModule: function (module) {
    this.initProvider(module);
    this.initService(module);
    this.initController(module);
    this.initDirective(module);
    this.initFilter(module);
  },
  $bind: function (events, ctrl, $scope) {
    $scope = ($scope ? $scope : ctrl.$scope);
    if (!$scope) {
      $scope = ctrl;
    }
    angular.forEach(events, function (key) {
      $scope[key] = angular.bind(ctrl, ctrl[key]);
    });
  },
  getHistoryById: function (ionicHistory, historyId) {
    return ionicHistory.viewHistory().histories[historyId];
  },
  getViewByHistory: function (ionicHistory, historyId, stateId) {
    var history = this.getHistoryById(ionicHistory, historyId);
    for (var i = 0; i < history.stack.length; i++) {
      if (history.stack[i].stateId === stateId) {
        return history.stack[i];
      }
    }
    return null;
  },
  getViewByRoot: function (ionicHistory, stateId) {
    return this.getViewByHistory(ionicHistory, 'root', stateId);
  }
};

whcyit.Pagination = whcyit.create({
  init: function () {
    this.pageNum = 0;
    this.hasNext = false;
    this.pageSize = 10;
    this.count = 0;
    this.pageCount = 0;
    this.items = [];
  },
  setCount: function (count) {
    this.count = count;
    this.pageCount = parseInt((count + this.pageSize - 1) / this.pageSize);
  },
  nextPage: function () {
    this.pageNum++;

    this.hasNext = this.pageNum <= this.pageCount;

    if (this.pageNum > this.pageCount) {
      this.pageNum = this.pageCount;
    }

    return this.pageNum;
  },
  skip: function () {
    return (this.pageNum - 1) * this.pageSize;
  }
});

whcyit.EventBus = whcyit.create({
  init: function () {
    this.eventGroup = {};
  },
  on: function (name, fn, scope) {
    var events = this.eventGroup[name];
    if (!events) {
      events = [];
      this.eventGroup[name] = events;
    }

    events.push(scope ? angular.bind(scope, fn) : fn);
  },
  fire: function () {
    var params = Array.prototype.slice.call(arguments, 0);
    var name = params.shift();
    var events = this.eventGroup[name];
    if (!events) {
      return;
    }

    events.forEach(function (event) {
      event(params);
    });
  },
  off: function (name, fn) {
    var events = this.eventGroup[name];
    if (!events) {
      return;
    }

    if (!fn) {
      this.eventGroup[name] = [];
      return;
    }

    this.eventGroup[name] = events.filter(function (event) {
      return event != fn;
    });
  },
  clear: function () {
    this.eventGroup = {};
  }
});

whcyit.eventBus = new whcyit.EventBus();

$(window).unload(function () {
  whcyit.eventBus.clear();
});

whcyit.ExclusiveDelay = whcyit.create({
  exec: function (fn, time) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    setTimeout(fn, time);
  }
});

var whcyitModule = angular.module('whcyit', ['ionic']);
whcyitModule.providers = {};
whcyitModule.providers.cyValidator = function () {
  var defaultRules = {
    required: "{0}不能为空",
    maxlength: "{0}输入值长度不能大于{maxlength}",
    minlength: "{0}输入值长度不能小于{minlength}",
    email: "{0}输入邮件的格式不正确",
    repeat: "{0}两次输入不一致",
    pattern: "{0}输入格式不正确",
    number: "{0}必须输入数字",
    uniqueCheck: "{0}已经存在，请重新输入",
    url: "{0}输入URL格式不正确",
    max: "{0}输入值不能大于{max}",
    min: "{0}输入值不能小于{min}"
  };

  function stringFormat(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    });
  }

  function validatorFn() {
    this.rules = [];
    this.isEmpty = function (object) {
      if (!object) {
        return true;
      }
      return (object instanceof Array && object.length === 0);
    };
  }

  validatorFn.prototype = {
    constructor: validatorFn,
    setRules: function (rules) {
      this.rules = rules;
    },
    getErrorMessage: function (validationName, elem) {
      var msgTpl = elem.getAttribute(validationName + '-message');
      if (msgTpl) {
        return msgTpl;
      }
      if (!this.isEmpty(this.rules[elem.name]) && !this.isEmpty(this.rules[elem.name][validationName])) {
        msgTpl = this.rules[elem.name][validationName];
      }
      var label = elem.getAttribute('label');
      if (msgTpl == null) {
        msgTpl = stringFormat(defaultRules[validationName], label);
      }
      switch (validationName) {
        case "maxlength":
          return msgTpl.replace("{maxlength}", elem.getAttribute("ng-maxlength"));
        case "minlength":
          return msgTpl.replace("{minlength}", elem.getAttribute("ng-minlength"));
        case "max":
          return msgTpl.replace("{max}", elem.getAttribute("max"));
        case "min":
          return msgTpl.replace("{min}", elem.getAttribute("min"));
        default :
        {
          if (msgTpl !== null) {
            return msgTpl;
          }
          if (defaultRules[validationName] === null) {
            throw new Error("该验证规则(" + validationName + ")默认错误信息没有设置！");
          }
          return msgTpl;
        }
      }
    },
    getErrorMessages: function (elem, errors) {
      var elementErrors = [];
      for (var err in errors) {
        if (errors[err]) {
          var msg = this.getErrorMessage(err, elem);
          elementErrors.push(msg);
        }
      }
      return elementErrors;
    }
  };

  var validator = new validatorFn();

  /**
   * 设置验证规则，提示信息
   * @param rules
   */
  this.setRules = function (rules) {
    validator.setRules(rules);
  };

  /**
   * get method
   * @returns {validatorFn}
   */
  this.$get = function () {
    return validator;
  }
};

whcyitModule.providers.cyUtils = function () {
  var options = {};
  this.setOptions = function (opts) {
    options = angular.extend({
      cancelType: 'button-default',
      okType: 'button-positive'
    }, opts);
  };

  this.$get = function ($ionicPopup, $ionicLoading, $sce, $rootScope) {
    return {
      // alert
      alert: function (msg, title, fn) {
        $ionicPopup.alert({
          title: title || '系统提示',
          template: msg || '',
          okText: '确 定',
          okType: options.okType
        }).then(function (res) {
          fn && fn();
        });
      },
      // confirm
      confirm: function (msg, title, okFn, cancelFn) {
        $ionicPopup.confirm({
          title: title || '系统提示',
          template: msg || '',
          okText: '确 定',
          cancelText: '取 消',
          cancelType: options.cancelType,
          okType: options.okType
        }).then(function (res) {
          if (res) {
            okFn && okFn();
          } else {
            cancelFn && cancelFn();
          }
        });
      },
      prompt: function (msg, title, okFn, cancelFn) {
        $ionicPopup.prompt({
          title: title || '系统提示',
          template: msg || '',
          inputType: 'text',
          inputPlaceholder: '',
          okText: '确 定',
          cancelText: '取 消',
          cancelType: options.cancelType,
          okType: options.okType
        }).then(function (res) {
          if (res) {
            okFn && okFn(res);
          } else {
            cancelFn && cancelFn();
          }
        });
      },
      // ajax
      ajax: function (opts, doneFn, failFn) {
        doneFn = doneFn || whcyit.emptyFunction;
        failFn = failFn || whcyit.emptyFunction;
        if (angular.isUndefined(opts.mask)) {
          opts.mask = true;
        }
        opts = angular.extend({
          type: 'post',
          dataType: 'json',
          traditional: true
        }, opts);

        if (opts.mask) {
          $ionicLoading.show();
        }
        if (opts.data && typeof(opts.data) != "string") {
          opts.data = this.param(opts.data);
        }
        $.ajax(opts).done(function (result, xhr) {
          if (opts.mask) {
            $ionicLoading.hide();
          }
          doneFn && doneFn(result, xhr);
          whcyit.safeApply($rootScope);
        }).fail(function (xhr, status, e) {
          if (opts.mask) {
            $ionicLoading.hide();
          }
          failFn && failFn(xhr, status, e);
          whcyit.safeApply($rootScope);
        });
      },
      ajaxWithError: function (opts, doneFn, failFn) {
        var me = this;
        this.ajax(opts, function (result, xhr) {
          if (result.status != 0) {
            me.alert(result.msg);
            failFn && failFn(result);
            return;
          }
          doneFn && doneFn(result, xhr);
        }, function (xhr, status, e) {
          failFn && failFn(xhr, status, e);
          me.alert(xhr.status == 404 ? '页面未找到' : '服务器无法正常处理请求');
        });
      },
      // 查询id
      queryById: function ($service, $scope, id) {
        $service.get(id, function (entity) {
          $scope.entity = entity;
        });
      },
      remove: function ($service, ids, msg, doneFn) {
        var me = this;
        if (msg) {
          this.confirm(msg, null, function () {
            me.remove($service, ids, null, doneFn);
          });
        } else {
          $service.remove(ids, function () {
            doneFn && doneFn();
          });
        }
      },
      // HTML数据格式处理
      toHtml: function (data, htmlFields) {
        if (htmlFields && data) {
          var me = this;
          if (angular.isArray(data)) {
            angular.forEach(data, function (kid) {
              me.toHtml(kid, htmlFields);
            });
          } else {
            angular.forEach(htmlFields, function (field) {
              var v = data[field];
              if (v && v != '') {
                data[field] = $sce.trustAsHtml(v);
              }
            });
          }
        }
        return data;
      },
      param: function (a) {
        var r20 = /%20/g, rbracket = /\[\]$/;

        function buildParams(prefix, obj, add) {
          var name;
          if (jQuery.isArray(obj)) {
            // Serialize array item.
            jQuery.each(obj, function (i, v) {
              // Item is non-scalar (array or object), encode its numeric index.
              if (typeof v === "object") {
                buildParams(prefix + "[" + i + "]", v, add);
              } else {
                add(prefix, v);
              }
            });

          } else if (jQuery.type(obj) === "object") {
            // Serialize object item.
            for (name in obj) {
              buildParams(prefix + "." + name, obj[name], add);
            }

          } else {
            // Serialize scalar item.
            add(prefix, obj);
          }
        }

        var prefix,
          s = [],
          add = function (key, value) {
            // If value is a function, invoke it and return its value
            value = jQuery.isFunction(value) ? value() : ( value == null ? "" : value );
            s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
          };


        // If an array was passed in, assume that it is an array of form elements.
        if (jQuery.isArray(a) || ( a.jquery && !jQuery.isPlainObject(a) )) {
          // Serialize the form elements
          jQuery.each(a, function () {
            add(this.name, this.value);
          });

        } else {
          // If traditional, encode the "old" way (the way 1.3.2 or older
          // did it), otherwise encode params recursively.
          for (prefix in a) {
            buildParams(prefix, a[prefix], add);
          }
        }

        // Return the resulting serialization
        return s.join("&").replace(r20, "+");
      }
    };
  };
};

whcyitModule.providers.cyCors = function () {
  var baseUrl = null;
  var appKey = null;
  var devMode = false;

  this.setBaseUrl = function (url) {
    baseUrl = url;
  };
  this.setAppKey = function (key) {
    appKey = key;
  };
  this.setDevMode = function (mode) {
    devMode = mode;
  };

  this.$get = function (cyUtils) {
    return {
      setLoginUrl: function (url) {
        this.loginUrl = url;
      },
      setTicket: function (ticket) {
        this.ticket = ticket;
      },
      ajax: function (opts, doneFn, failFn) {
        opts.url = this.getUrl(opts.url);
        var params = [];
        if (appKey) {
          params.push('appKey=' + appKey);
        }
        if (this.ticket) {
          params.push('__ticket__=' + this.ticket);
        }
        if (devMode) {
          params.push('devMode=true');
        }
        opts.url = opts.url + (opts.url.indexOf('?') != -1 ? '&' : '?') + params.join('&');
        cyUtils.ajaxWithError(opts, doneFn, function (result, status, e) {
          if (result.data && result.data == whcyit.ticket_expired) {
            whcyit.eventBus.fire(whcyit.ticket_expired);
            return;
          }

          failFn && failFn(result, status, e);
        });
      },
      login: function (opts, doneFn, failFn) {
        if (!this.loginUrl) {
          this.loginUrl = opts.url;
        }
        var options = {
          url: this.getUrl(this.loginUrl),
          data: angular.extend({
            __login__: true
          }, opts)
        };
        var me = this;
        cyUtils.ajaxWithError(options, function (result, xhr) {
          me.ticket = result.data;
          doneFn && doneFn(result, xhr);
        }, failFn);
      },
      logout: function (opts, doneFn, failFn) {
        if (!this.loginUrl) {
          this.loginUrl = opts.url;
        }
        var opts = {
          url: this.getUrl(this.loginUrl),
          data: {
            __ticket__: this.ticket,
            __logout__: true
          }
        };
        var me = this;
        cyUtils.ajaxWithError(opts, function (result, xhr) {
          me.ticket = null;
          doneFn && doneFn(result, xhr);
        }, failFn);
      },
      getUrl: function (url) {
        var newUrl = url.toLowerCase();
        var result = url + (url.indexOf('?') != -1 ? '&' : '?') + '__cors-request__=true';
        if (newUrl.indexOf('http://') == 0 || newUrl.indexOf('https://') == 0) {
          return result;
        }
        return baseUrl ? baseUrl + result : result;
      }
    };
  };
};

//控件
whcyitModule.directivies = {
  cyFocus: ['$timeout', function ($timeout) {
    return {
      restrict: 'A',
      link: function ($scope, $element, $attr) {
        var unwatch = $scope.$watch($attr['cy-focus'], function (value) {
          if (value === false) {
            return;
          }

          var focus = true;
          if (value) {
            focus = $scope.$eval(value);
          }

          if (focus) {
            $timeout(function () {
              $element[0].focus();
            }, 500);
          }
        });

        $scope.$on('$destroy', function () {
          unwatch();
        });
      }
    };
  }],
  cyNumber: function () {
    return {
      restrict: 'A',
      require: '?ngModel',
      priority: 1000,
      template: '<span class="minus ion-ios-minus-empty" ng-disabled="disabled"  ng-click="minus()"></span>'
      + '<input class="input" type="number" ng-model="value" ng-disabled="disabled" ng-readonly="readonly"/>'
      + '<span class="plus ion-ios-plus-empty" ng-disabled="disabled" ng-click="plus()"></span>',
      scope: {
        minValue: '=',
        maxValue: '=',
        step: '=',
        precision: '=',
        cssClass: '=',
        readonly: '=',
        disabled: '=',
        ngChange: '&'
      },
      compile: function ($el, $attrs) {
        $el.addClass("cy-number");
        var $$minus = $('.minus', $el);
        var $$plus = $('.plus', $el);
        var $$input = $('.input', $el);

        var link = function ($scope, $el, $attrs, ctrl) {
          var ngModel = ctrl;
          $scope.cssClass && $el.addClass($scope.cssClass);
          var disabled = angular.isUndefined($scope.disabled) ? null : $scope.disabled;
          var min = angular.isUndefined($scope.minValue) ? null : $scope.minValue;
          var max = angular.isUndefined($scope.maxValue) ? null : $scope.maxValue;
          var step = angular.isUndefined($scope.step) ? 1 : $scope.step;
          var precision = angular.isUndefined($scope.precision) ? 0 : parseInt($scope.precision);

          ngModel.$render = function () {
            ngModel.$setViewValue(ngModel.$isEmpty(ngModel.$viewValue) ? '' : ngModel.$viewValue);
            $scope.value = ngModel.$viewValue;
          };

          var refreshDisabled = function () {
            var min = angular.isUndefined($scope.minValue) ? null : $scope.minValue;
            var max = angular.isUndefined($scope.maxValue) ? null : $scope.maxValue;
            if (max != null && ngModel.$viewValue >= max)
              $$plus.attr('disabled', 'disabled');
            if (min != null && ngModel.$viewValue <= min)
              $$minus.attr('disabled', 'disabled');
            if (!$scope.disabled) {
              if (max != null && ngModel.$viewValue < max)
                $$plus.removeAttr('disabled');
              if (min != null && ngModel.$viewValue > min)
                $$minus.removeAttr('disabled');
            }
          };

          refreshDisabled();

          var unwatch = $scope.$watch('value', function (newValue, oldValue) {
            //为了能取到最新的值，这里必须要重新从scope中取
            var min = angular.isUndefined($scope.minValue) ? null : $scope.minValue;
            var max = angular.isUndefined($scope.maxValue) ? null : $scope.maxValue;
            refreshDisabled();
            if (newValue == oldValue) {
              return;
            }
            if (min != null && (newValue <= min)) {
              newValue = min;
            }
            if (max != null && (newValue >= max)) {
              newValue = max;
            }


            if (newValue != '') {
              if (precision == 0) {
                newValue = (typeof newValue) === 'Number' ? Math.round(newValue) : parseInt(newValue);
              } else {
                newValue = (typeof newValue) === 'Number' ? newValue.toFixed(precision) : parseFloat(newValue).toFixed(precision);
              }
            }

            $scope.value = newValue;
            ngModel.$setViewValue(newValue);
            refreshDisabled();
          });

          $scope.minus = function () {
            if ($scope.disabled)
              return;
            //if ($$minus.hasClass('disabled')) {
            //  return;
            //}
            $scope.value = ($scope.value === '' ? 0 : $scope.value - step);
          };
          $scope.plus = function () {
            if ($scope.disabled)
              return;
            //if ($$plus.hasClass('disabled')) {
            //  return;
            //}
            $scope.value = ($scope.value === '' ? 1 : $scope.value + step);
          };

          $scope.$on('$destroy', function () {
            unwatch();
          });
        };

        return link;
      }
    };
  },
  cyStarRating: function () {
    return {
      restrict: 'A',
      require: '?ngModel',
      priority: 1000,
      template: '<ul class="rating" ng-mouseout="out()"><li ng-repeat="star in stars" class="star" ng-class="star" ng-click="click($index + 1)" ng-mouseover="over($index + 1)"></li></ul>',
      scope: {
        // 最多的星星个数
        max: '=',
        // 是否显示半颗心（只在只读模式下有效）
        half: '@',
        // 是否使用hover属性
        ratingHover: '@',
        // 是否只读
        readonly: '@'
      },
      link: function ($scope, $el, $attrs, ctrl) {
        $el.addClass("cy-star-rating");
        var ngModel = ctrl;
        var max = $scope.max || 5;
        $scope.half = $scope.half || false;
        $scope.ratingHover = $scope.ratingHover || false;
        $scope.hoveValue = -1;
        $scope.readonly = ($scope.readonly && $scope.readonly === 'true');
        if ($scope.half) {
          $scope.readonly = true;
        }

        var delay = new whcyit.ExclusiveDelay();

        if ($scope.ratingHover) {
          var unwatch = $scope.$watch('hoveValue', function (oldVal, newVal) {
            if (newVal != oldVal) {
              delay.exec(updateStars, 10);
            }
          });

          $scope.$on('$destroy', function () {
            unwatch();
          });
        }

        ngModel.$render = function () {
          ngModel.$setViewValue(ngModel.$isEmpty(ngModel.$viewValue) ? 0 : ngModel.$viewValue);
          delay.exec(updateStars, 10);
        };

        $scope.click = function (val) {
          if (!$scope.readonly) {
            ngModel.$setViewValue(val);
            delay.exec(updateStars, 10);
          }
        };
        $scope.over = function (val) {
          if (!$scope.readonly && $scope.ratingHover) {
            $scope.hoveValue = val;
          }
        };
        $scope.out = function () {
          if (!$scope.readonly && $scope.ratingHover) {
            $scope.hoveValue = -1;
          }
        };

        function getStart(i) {
          if ($scope.half && $scope.readonly) {
            // 数据取整
            var v = Math.round(ngModel.$modelValue * 2) / 2;
            if (i <= v - 1) {
              return {
                'filled': true
              };
            } else if ((v > i) && (i < v + 1)) {
              return {
                'filled-half': true
              };
            }
            return {};
          }
          return {
            'filled': $scope.hoveValue == -1 ? (i < ngModel.$viewValue) : (i < $scope.hoveValue)
          };
        }

        function updateStars() {
          $scope.stars = [];
          for (var i = 0; i < max; i++) {
            $scope.stars.push(getStart(i));
          }
          whcyit.safeApply($scope);
        }
      }
    };
  },
  cyVirtualNumberKeyboard: function () {
    return {
      restrict: 'A',
      require: '?ngModel',
      scope: {
        ngChange: "&"
      },
      template: '<div class="row"><div class="col" ng-click="add(\'1\')">1</div>'
      + '<div class="col" ng-click="add(\'2\')">2</div>'
      + '<div class="col" ng-click="add(\'3\')">3</div></div>'
      + '<div class="row"><div class="col" ng-click="add(\'4\')">4</div>'
      + '<div class="col"  ng-click="add(\'5\')">5</div>'
      + '<div class="col" ng-click="add(\'6\')">6</div></div>'
      + '<div class="row"><div class="col" ng-click="add(\'7\')">7</div>'
      + '<div class="col" ng-click="add(\'8\')">8</div>'
      + '<div class="col" ng-click="add(\'9\')">9</div></div>'
      + '<div class="row"><div class="col" ng-click="clear()">清空</div>'
      + '<div class="col" ng-click="add(\'0\')">0</div>'
      + '<div class="col" ng-click="backspace()"><i class="ion-backspace" ></i></div></div>',
      controller: ['$scope', function ($scope) {
        $scope.add = function (v) {
          if ($scope.keyValue == '0') {
            if (v == '0') {
              return;
            }
            $scope.keyValue = v;
          } else {
            $scope.keyValue += v;
          }
        };
        $scope.clear = function () {
          if (!$scope.keyValue || $scope.keyValue == '') {
            return;
          }
          $scope.keyValue = '';
        };
        $scope.backspace = function () {
          if (!$scope.keyValue || $scope.keyValue == '') {
            $scope.keyValue = '';

          } else if ($scope.keyValue.length == 1) {
            $scope.keyValue = '';
          } else {
            $scope.keyValue = $scope.keyValue.substring(0, $scope.keyValue.length - 1);
          }
        }
      }],
      link: function ($scope, $el, $attrs, ngModel) {
        $el.addClass('cy-virtual-number-keyboard');
        ngModel.$render = function () {
          $scope.keyValue = ngModel.$viewValue;
        };
        var unwatch = $scope.$watch('keyValue', function (newValue, oldValue) {
          if (newValue == oldValue) {
            return;
          }
          $scope.keyValue = newValue;
          ngModel.$setViewValue(newValue);
        });
        $scope.$on('$destroy', function () {
          unwatch();
        });
      }
    };
  },
  cyVirtualKeyboard: function () {
    return {
      restrict: 'A',
      require: '?ngModel',
      scope: {
        ngChange: "&"
      },
      link: function ($scope, $el, $attrs, ngModel) {
        ngModel.$render = function () {
          $scope.keyValue = ngModel.$viewValue;
        };
        var unwatch = $scope.$watch('keyValue', function (newValue, oldValue) {
          if (newValue == oldValue) {
            return;
          }
          $scope.keyValue = newValue;
          ngModel.$setViewValue(newValue);
        });
        $scope.$on('$destroy', function () {
          unwatch();
        });

        $el.addClass('cy-virtual-keyboard');
        var keys = [];
        for (var i = 0; i < 26; i++) {
          keys.push(String.fromCharCode(65 + i));
        }
        keys.push("");
        var backLabel = "退格";
        var clearLabel = "清空";
        var closeLabel = "关闭";
        keys.push(backLabel);
        keys.push(clearLabel);
        keys.push(closeLabel);
        var htmls = [];
        var max = 5;
        for (var i = 0, size = keys.length; i < size; i++) {
          var isBegin = (i % max) == 0 && (i != size);
          var isEnd = isBegin && (i != 0);
          if (isEnd) {
            htmls.push('</div>');
          }
          if (isBegin) {
            htmls.push('<div class="row">');
          }

          htmls.push('<div class="col" key="');
          htmls.push(keys[i]);
          htmls.push('"');
          htmls.push('>');
          htmls.push(keys[i]);
          htmls.push('</div>');
        }
        var last = max - (keys.length % max);
        if (last == max) {
          htmls.push('</div>');
        } else if (last > 0) {
          for (var i = 0; i < last; i++) {
            htmls.push('<div class="col"></div>');
          }
          htmls.push('</div>');
        }
        var html = htmls.join('');
        $el.html(html);
        $('.col', $el).each(function (i, el) {
          el = $(el);
          var key = el.attr('key');
          el.click(function () {
            if (key == closeLabel)
              $($el).hide();
            else if (key == backLabel) {
              if ($scope.keyValue.length > 0)
                $scope.keyValue = $scope.keyValue.substr(0, $scope.keyValue.length - 1);
              whcyit.safeApply($scope);
            }
            else if (key == clearLabel) {
              $scope.keyValue = "";
              whcyit.safeApply($scope);
            } else {
              $scope.keyValue += key;
              whcyit.safeApply($scope);
            }
          });
        });
      }
    };
  },
  // 验证框架
  cyForm: ['$parse', 'cyValidator', 'cyUtils', function ($parse, cyValidator, cyUtils) {
    return {
      controller: ['$scope', function ($scope) {
        this.form = null;
        this.$errors = null;

        var ctrl = this;
        this.doValidate = function (doneFn) {
          if (angular.isFunction(this.form.doValidate)) {
            this.form.doValidate();
          }
          if (this.form.$valid && angular.isFunction(doneFn)) {
            $scope.$apply(function () {
              doneFn($scope);
            });
          } else if (!this.form.$valid) {
            cyUtils.alert(ctrl.$errors[0]);
          }
        }
      }],
      link: function (scope, form, attr, ctrl) {
        var formElem = form[0], formName = form.attr("name");
        ctrl.form = scope[formName];

        function doValidate() {
          var errorMessages = [];
          // 循环验证
          $.each($(form).find('*[ng\\-model]'), function (idx, elem) {
            var $$el = angular.element(elem);
            var name = elem.name || $$el.attr('name');
            if (scope[formName][name].$valid) {
              $$el.removeClass("error").addClass("valid");
            } else {
              var elementErrors = cyValidator.getErrorMessages(elem, scope[formName][name].$error);
              errorMessages.push(elementErrors[0]);
            }
          });

          if (!cyValidator.isEmpty(errorMessages) && errorMessages.length > 0) {
            scope[formName].$errors = errorMessages;
          } else {
            scope[formName].$errors = [];
          }
          ctrl.$errors = scope[formName].$errors;

          if (!scope.$$phase) {
            scope.$apply(scope[formName].$errors);
          }
        }

        if (scope[formName]) {
          scope[formName].doValidate = doValidate;
        }
      }
    };
  }],
  cyField: ['$compile', function ($compile) {
    return {
      restrict: 'A',
      scope: false,
      replace: true,
      priority: 1100,
      terminal: true,
      compile: function (element, attrs) {

        element.attr("ng-model", attrs.cyField);
        var lastPartOfName = attrs.cyField.substring(attrs.cyField.lastIndexOf('.') + 1);

        if (!attrs.name) {
          element.attr("name", lastPartOfName);
        }

        if (!attrs.type && element.prop('tagName').toUpperCase() === 'INPUT') {
          element.prop('type', 'text');
        }

        if (!attrs.label) {
          if (lastPartOfName.lastIndexOf('Id') === lastPartOfName.length - 2) {
            lastPartOfName = lastPartOfName.substring(0, lastPartOfName.length - 2);
          }

          element.attr('label', lastPartOfName);
        }

        element.removeAttr('cy-field');

        return function (scope, element) {
          $compile(element)(scope);
        };
      }
    };
  }],
  cyFormSubmit: ['$parse', function ($parse) {
    return {
      require: "^cyForm",
      link: function (scope, el, attr, ctrl) {
        var validSuccessFn = $parse(attr.cyFormSubmit);
        el.bind("click", function () {
          ctrl.doValidate(validSuccessFn);
        });
      }
    };
  }],
  cyRepeat: [function () {
    return {
      require: "ngModel",
      priority: 1000,
      link: function (scope, elem, attrs, ctrl) {
        var otherInput = elem.inheritedData("$formController")[attrs.cyRepeat];

        ctrl.$parsers.push(function (value) {
          if (value === otherInput.$viewValue) {
            ctrl.$setValidity("repeat", true);
            return value;
          }
          ctrl.$setValidity("repeat", false);
        });

        otherInput.$parsers.push(function (value) {
          ctrl.$setValidity("repeat", value === ctrl.$viewValue);
          return value;
        });
      }
    };
  }],
  cyUniqueCheck: ['$timeout', '$http', 'cyUtils', function ($timeout, $http, cyUtils) {
    return {
      require: "ngModel",
      priority: 1000,
      link: function (scope, elem, attrs, ctrl) {
        var doValidate = function () {
          var url = scope.$eval(attrs.cyUniqueCheck);
          var checkType = attrs.checkType || 'post';
          if (!url) {
            url = attrs.cyUniqueCheck;
          }
          cyUtils.ajax({url: url, type: checkType, data: {data: ctrl.$viewValue}}, function (result) {
            var checkRtn = (result == 'true') || result.status == 0;
            ctrl.$setValidity('uniqueCheck', checkRtn);
          })
        };

        var unwatch = scope.$watch(attrs.ngModel, function (newValue) {
          if (newValue && ctrl.$dirty) {
            doValidate();
          }
        });
        scope.$on('$destroy', function () {
          unwatch();
        });

        elem.bind("blur.cyUniqueCheck", function () {
          $timeout(function () {
            if (ctrl.$invalid && !ctrl.$error.uniqueCheck) {
              return;
            }
            doValidate();
          });
        });
        scope.$on('$destroy', function () {
          elem.unbind("blur.cyUniqueCheck");
        });
      }
    };
  }],
  cyMutualButtonBar: function () {
    return {
      restrict: 'E',
      template: '<div class="row {{barClass}}">'
      + '  <div class="col" ng-class="{true: activateClass}[options.current.id == v.id]" ng-repeat="v in options.items" ng-click="onItemClick({v:v})" align="center">'
      + '    {{v.name}}'
      + '  </div>'
      + '</div>',
      scope: {
        options: '=',
        onItemClick: '&'
      },
      link: function (scope, elements, attrs) {
        scope.barClass = attrs.barClass;
        scope.activateClass = attrs.activateClass;
      }
    };
  }
};

whcyitModule.controllers = {};
whcyitModule.controllers.AbstractCtrl = whcyit.create({
  init: function ($scope) {
    this.$scope = $scope;

    $scope.$on("$ionicView.beforeEnter", angular.bind(this, function (event, data) {
      this.beforeEnter(event, data);
    }));
    $scope.$on('$ionicView.afterEnter', angular.bind(this, function (event, data) {
      this.afterEnter(event, data);
    }));
    $scope.$on('$destroy', angular.bind(this, function() {
      this.destroy();
    }));
  },
  beforeEnter: function (event, data) {
  },
  afterEnter: function (event, data) {
  },
  destroy: function () {
  }
});

// 过滤器
whcyitModule.filters = {
  // 用于将'2015-03-24 22:20:30'的数据转换为日期对象
  toDate: function () {
    return function (date) {
      if (!date)
        return date;
      return new Date(date);
    }
  }
};

whcyit.initModule(whcyitModule);