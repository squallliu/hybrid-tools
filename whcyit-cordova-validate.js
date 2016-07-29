angular.module('whcyit-cordova-validate', ['ngCordova.plugins.toast'])

  .directive('checkForm', function($parse, $timeout, $cordovaToast){
    return {
      require: '^form',
      restrict: 'A',
      priority: -1,   // 为了在ng-click之前执行，所以这里优先级设成-1
      scope: {
        errorTips: '=?'
      },
      link: function(scope, element, attrs, ctrl){
        var form = angular.element(element[0].form);
        var formCtrl = ctrl;

        var defaultTips = {
          required: '不能为空',
          minlength: '太短',
          maxlength: '太长',
          pattern: '格式不正确',
          number: '必须为数值',
          phone: '格式不正确',
          'id-card': '格式不正确'
        }

        if(angular.isUndefined(scope.errorTips)){
          scope.errorTips = defaultTips;
        }

        element.on('click', function(event){
          if(formCtrl.$invalid){
            //验证不通过时，阻止事件传播
            event.stopImmediatePropagation();
            //阻止默认事件执行
            event.preventDefault();

            var inputWithErr = angular.element(form[0].getElementsByClassName('ng-invalid')[0]);

            $timeout(function(){
              inputWithErr.focus();
            }, 0);

            var errorTips = inputWithErr.attr('errorTips');
            if(angular.isDefined(errorTips)){
              inputWithErr.removeAttr('errorTypes');
            }
            if(angular.isUndefined(errorTips)){
              var tipsKeys = Object.keys(defaultTips);
              angular.forEach(tipsKeys, function(v){
                if(inputWithErr.attr(v)){
                  errorTips = scope.errorTips[v];
                }
              })
            }
            if(angular.isDefined(inputWithErr.attr('label'))){
              errorTips = inputWithErr.attr('label') + errorTips;
            }
            $cordovaToast.showShortCenter(errorTips);
          }
        })
      }
    }
  })

  .directive('phone', function(){
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ctrl){
        ctrl.$validators.phone = function(modelValue){
          if(angular.isUndefined(modelValue)){
            return true;
          }
          return _phone(modelValue);
        }

        function _phone(value){
          if(value === "")
            return true;
          var mobile = /^(((13[0-9]{1})|(15[0-9]{1})|(18[0-9]{1}))+\d{8})$/;
          var tel = /^\d{3,4}-?\d{7,9}$/;
          return (tel.test(value) || mobile.test(value));
        }
      }
    }
  })

  .directive('idCard', function(){
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ctrl){
        ctrl.$validators.idCard = function(modelValue){
          if(angular.isUndefined(modelValue)){
            return true;
          }
          var msg = _testIdCardNo(modelValue);
          if(msg != '') element.attr('errorTips', msg);
          return msg == '';
        }

        function _testIdCardNo(idcard){
          var Errors = new Array("", "位数不对!", "出生日期超出范围或含有非法字符!", "校验错误!", "地区非法!");
          if(idcard == '')
            return Errors[0];
          var area = {
            11: "北京",
            12: "天津",
            13: "河北",
            14: "山西",
            15: "内蒙古",
            21: "辽宁",
            22: "吉林",
            23: "黑龙江",
            31: "上海",
            32: "江苏",
            33: "浙江",
            34: "安徽",
            35: "福建",
            36: "江西",
            37: "山东",
            41: "河南",
            42: "湖北",
            43: "湖南",
            44: "广东",
            45: "广西",
            46: "海南",
            50: "重庆",
            51: "四川",
            52: "贵州",
            53: "云南",
            54: "西藏",
            61: "陕西",
            62: "甘肃",
            63: "青海",
            64: "宁夏",
            65: "新疆",
            71: "台湾",
            81: "香港",
            82: "澳门",
            91: "国外"
          }
          var Y, JYM;
          var S, M;
          var idcard_array = new Array();
          idcard_array = idcard.split("");
          if(area[parseInt(idcard.substr(0, 2))] == null)
            return Errors[4];
          switch(idcard.length){
            case 15 :
              if((parseInt(idcard.substr(6, 2)) + 1900) % 4 == 0
                || ((parseInt(idcard.substr(6, 2)) + 1900) % 100 == 0 && (parseInt(idcard.substr(6, 2)) + 1900) % 4 == 0)){
                ereg = /^[1-9][0-9]{5}[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|[1-2][0-9]))[0-9]{3}$/; // 测试出生日期的合法性
              }else{
                ereg = /^[1-9][0-9]{5}[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|1[0-9]|2[0-8]))[0-9]{3}$/; // 测试出生日期的合法性
              }
              if(ereg.test(idcard))
                return Errors[0];
              else
                return Errors[2];
              break;
            case 18 :
              if(parseInt(idcard.substr(6, 4)) % 4 == 0
                || (parseInt(idcard.substr(6, 4)) % 100 == 0 && parseInt(idcard.substr(6, 4)) % 4 == 0)){
                ereg = /^[1-9][0-9]{5}19[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|[1-2][0-9]))[0-9]{3}[0-9Xx]$/; // 闰年出生日期的合法性正则表达式
              }else{
                ereg = /^[1-9][0-9]{5}19[0-9]{2}((01|03|05|07|08|10|12)(0[1-9]|[1-2][0-9]|3[0-1])|(04|06|09|11)(0[1-9]|[1-2][0-9]|30)|02(0[1-9]|1[0-9]|2[0-8]))[0-9]{3}[0-9Xx]$/; // 平年出生日期的合法性正则表达式
              }
              if(ereg.test(idcard)){
                S = (parseInt(idcard_array[0]) + parseInt(idcard_array[10])) * 7
                  + (parseInt(idcard_array[1]) + parseInt(idcard_array[11])) * 9
                  + (parseInt(idcard_array[2]) + parseInt(idcard_array[12])) * 10
                  + (parseInt(idcard_array[3]) + parseInt(idcard_array[13])) * 5
                  + (parseInt(idcard_array[4]) + parseInt(idcard_array[14])) * 8
                  + (parseInt(idcard_array[5]) + parseInt(idcard_array[15])) * 4
                  + (parseInt(idcard_array[6]) + parseInt(idcard_array[16])) * 2 + parseInt(idcard_array[7]) * 1
                  + parseInt(idcard_array[8]) * 6 + parseInt(idcard_array[9]) * 3;
                Y = S % 11;
                M = "F";
                JYM = "10X98765432";
                M = JYM.substr(Y, 1);
                if(M == idcard_array[17])
                  return Errors[0];
                else
                  return Errors[3];
              }else
                return Errors[2];
              break;
            default :
              return Errors[1];
              break;
          }
        }
      }
    }
  });
