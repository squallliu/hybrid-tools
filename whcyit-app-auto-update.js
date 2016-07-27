angular.module('whcyit-app-auto-update', [
  'whcyit', 'ngCordova.plugins.fileTransfer', 'ngCordova.plugins.fileOpener2',
  'ngCordova.plugins.toast'
]);
(function (angular, document) {
  'use strict';
  angular.module('whcyit-app-auto-update').provider('cyAppAutoUpdate', function () {
    var url;
    return {
      setUrl: function (v) {
        url = v;
      },
      $get: function ($ionicPlatform, $cordovaFileTransfer, $cordovaFileOpener2, $cordovaToast, cyUtils, $ionicPopup, $rootScope) {
        return {
          start: function () {
            document.addEventListener('chcp_updateInstalled', function (eventData) {
              $cordovaToast.showLongTop('程序已更新完成，重启后生效...');
            }, false);

            document.addEventListener("chcp_updateLoadFailed", function (eventData) {
              var error = eventData.detail.error;
              if (error && error.code == chcp.error.APPLICATION_BUILD_VERSION_TOO_LOW) {
                if (!ionic.Platform.isAndroid()) {
                  return;
                }

                var targetPath = cordova.file.externalApplicationStorageDirectory + '/app/app.apk';
                var options = {};
                cyUtils.confirm('发现新版本,是否现在更新?', '系统通知', function () {
                  $ionicPlatform.registerBackButtonAction(function(){
                    return
                  }, 401);
                  $ionicPopup.show({
                    template: '<progress max="100" value="{{progress}}"></progress>',
                    title: '下载更新,请不要退出程序',
                    scope: $rootScope,
                  });

                  $cordovaFileTransfer.download(url, targetPath, options, true).then(function () {
                    $cordovaFileOpener2.open(
                      targetPath,
                      'application/vnd.android.package-archive'
                    ).then(function () {
                    }, function (e) {
                      console.log(e);
                    });
                  }, function (e) {
                    console.log(e);
                  }, function (progress) {
                    $rootScope.progress = ((progress.loaded / progress.total) * 100).toFixed(2);
                  });
                });
              }
            }, false);
          }
        }
      }
    }
  });
})(angular, document);
