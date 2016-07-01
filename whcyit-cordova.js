var whcyitCordovaModule = angular.module('whcyit-cordova', [
  'whcyit', 'ngCordova.plugins.network', 'ngCordova.plugins.geolocation', 'ngCordova.plugins.toast',
  'ngCordova.plugins.keyboard', 'ngCordova.plugins.file'
]);
whcyitCordovaModule.services = {};

whcyitCordovaModule.services.backButtonToExitService = whcyit.create({
  init: function ($ionicPlatform, $location, $rootScope, $cordovaToast, $ionicHistory, $cordovaKeyboard) {
    this.$ionicPlatform = $ionicPlatform;
    this.$location = $location;
    this.$rootScope = $rootScope;
    this.$cordovaToast = $cordovaToast;
    this.$ionicHistory = $ionicHistory;
    this.$cordovaKeyboard = $cordovaKeyboard;
  },
  process: function (homes) {
    var me = this;
    me.$ionicPlatform.registerBackButtonAction(function (e) {
      var isHome = false;
      for (var i = 0; i < homes.length; i++) {
        isHome = me.$location.path() == homes[i];
        if (isHome) {
          break;
        }
      }

      if (isHome) {
        if (me.$rootScope.backButtonPressedOnceToExit) {
          ionic.Platform.exitApp();
        } else {
          me.$rootScope.backButtonPressedOnceToExit = true;
          me.$cordovaToast.showShortBottom('再按一次退出系统');
          setTimeout(function () {
            me.$rootScope.backButtonPressedOnceToExit = false;
          }, 2000);
        }
      }
      else if (me.$ionicHistory.backView()) {
        if (me.$cordovaKeyboard.isVisible()) {
          me.$cordovaKeyboard.close();
        } else {
          me.$rootScope.$ionicGoBack();
        }
      }
      e.preventDefault();
      return false;
    }, 101);
  }
});

whcyitCordovaModule.services.networkStateService = whcyit.create({
  init: function ($rootScope, $cordovaNetwork) {
    this.$rootScope = $rootScope;
    this.$cordovaNetwork = $cordovaNetwork;
  },
  isOnline: function () {
    return this.$cordovaNetwork.isOnline();
  },
  isOffline: function () {
    return this.$cordovaNetwork.isOffline();
  },
  /**
   * Connection Type	Description
   * Connection.UNKNOWN	Unknown connection
   * Connection.ETHERNET	Ethernet connection
   * Connection.WIFI	WiFi connection
   * Connection.CELL_2G	Cell 2G connection
   * Connection.CELL_3G	Cell 3G connection
   * Connection.CELL_4G	Cell 4G connection
   * Connection.CELL	Cell generic connection
   * Connection.NONE	No network connection
   * @returns Connection.type
   */
  getNetwork: function () {
    return this.$cordovaNetwork.getNetwork();
  },
  watch: function (online, offline) {
    this.$rootScope.$on('$cordovaNetwork:online', angular.bind(this, function (event, networkState) {
      if (online) {
        online(event, networkState);
      }
    }));

    this.$rootScope.$on('$cordovaNetwork:offline', angular.bind(this, function (event, networkState) {
      if (offline) {
        offline(event, networkState);
      }
    }));
  },
  stop: function () {
    this.$cordovaNetwork.clearOnlineWatch();
    this.$cordovaNetwork.clearOfflineWatch();
  }
});

whcyitCordovaModule.services.geolocationService = whcyit.create({
  init: function ($cordovaGeolocation, $cordovaToast, $ionicLoading) {
    this.$cordovaGeolocation = $cordovaGeolocation;
    this.$cordovaToast = $cordovaToast;
    this.$ionicLoading = $ionicLoading;
    this.posOptions = {enableHighAccuracy: false, timeout: 20000};
  },
  location: function () {
    var me = this;
    me.$ionicLoading.show({template: '正在获取当前位置...'});
    me.$cordovaGeolocation.getCurrentPosition(me.posOptions).then(function (position) {
      me.$ionicLoading.hide();
      whcyit.eventBus.fire('gps-changed', position);
    }, function (err) {
      me.$ionicLoading.hide();
      me.$cordovaToast.showLongTop('获取位置信息失败，请稍后。重新获取中...');
      whcyit.eventBus.fire('gps-error', err);
    });
  },
  watch: function (changed, error) {
    if (this.watchObj) {
      return;
    }

    this.watchObj = this.$cordovaGeolocation.watchPosition(this.posOptions);
    this.watchObj.then(
      null,
      function (err) {
        if (error) {
          error(err);
        }
      },
      function (position) {
        if (changed) {
          changed(position);
        }
      }
    );
  },
  stop: function () {
    if (this.watchObj) {
      this.watchObj.clearWatch();
      this.watchObj = null;
    }
  }
});

whcyitCordovaModule.services.persistenceMananger = whcyit.create({
  init: function ($q) {
    this.$q = $q;
  },
  open: function (dbname) {
    persistence.store.cordovasql.config(
      persistence, dbname, '0.0.1', 'App database', 5 * 1024 * 1024, 0
    );
  },
  close: function (fn) {
    persistence.db.conn.close(fn);
  },
  schemaSync: function (defines, isDebug) {
    var me = this;
    return this.$q(function (resolve, reject) {
      persistence.debug = isDebug ? true : false;

      angular.forEach(defines, function (define) {
        me[define.name] = persistence.define(define.name, define.struct);
      });

      angular.forEach(defines, function (define) {
        angular.forEach(define.relations, function (relation) {
          if (relation.targetProp) {
            me[define.name][relation.type](relation.prop, me[relation.propType], relation.targetProp);
            return;
          }
          me[define.name][relation.type](relation.prop, me[relation.propType]);
        })
      });

      persistence.schemaSync(function (tx, err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  add: function (obj) {
    if (angular.isArray(obj)) {
      angular.forEach(obj, function (o) {
        persistence.add(o);
      });
    } else {
      persistence.add(obj);
    }
    return this.$q(function (resolve, reject) {
      persistence.flush(function (tx, err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  update: function (entity, id, modifyHandler) {
    if (!entity.load) {
      return;
    }
    return this.$q(function (resolve, reject) {
      entity.load(id, function (obj) {
        modifyHandler(obj);
        persistence.flush(function (tx, err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  },
  remove: function (obj) {
    persistence.remove(obj);
    return this.$q(function (resolve, reject) {
      persistence.flush(function (tx, err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  removeAll: function (cls) {
    var deferred = this.$q.defer();
    cls.all().destroyAll(function () {
      deferred.resolve();
    });
    return deferred.promise;
  },
  pagination: function (queryCollection, pagination) {
    var me = this;
    return me.$q(function (resolve, reject) {
      if (pagination.count > 0) {
        resolve(pagination.count);
        return;
      }

      queryCollection.count(function (count, err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(count);
      })
    }).then(function (count) {
      return me.$q(function (resolve, reject) {
        pagination.setCount(count);

        if (count <= 0) {
          resolve(pagination);
          return;
        }

        pagination.nextPage();

        if (!pagination.hasNext) {
          resolve(pagination);
          return;
        }

        queryCollection.skip(pagination.skip()).limit(pagination.pageSize).list(function (list, err) {
          if (err) {
            reject(err);
            return;
          }
          pagination.items = pagination.items.concat(list);
          resolve(pagination);
        })
      });
    });
  }
});

whcyitCordovaModule.services.AbstractFileStoreService = whcyit.create({
  init: function ($cordovaFile, $q) {
    this.$cordovaFile = $cordovaFile;
    this.$q = $q;

    this.initData();
  },
  initData: function () {
  }
});

whcyitCordovaModule.services.localFileCacheService = whcyit.create(
  whcyitCordovaModule.services.AbstractFileStoreService, {
    load: function (filename) {
      var deferred = this.$q.defer();

      var me = this;
      me.$cordovaFile.checkFile(cordova.file.dataDirectory, filename).then(function (success) {
        return me.$cordovaFile.readAsText(cordova.file.dataDirectory, filename);
      }).then(function (json) {
        deferred.resolve(JSON.parse(json));
      }).catch(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },
    write: function (filename, data, replace) {
      return this.$cordovaFile.writeFile(cordova.file.dataDirectory, filename, data, replace);
    },
    writeExistingFile: function (filename, data) {
      return this.$cordovaFile.writeExistingFile(cordova.file.dataDirectory, filename, data);
    },
    remove: function (filename) {
      return this.$cordovaFile.removeFile(cordova.file.dataDirectory, filename);
    }
  }
);

whcyitCordovaModule.services.noReaptListStoreService = whcyit.create(
  whcyitCordovaModule.services.localFileCacheService, {
    initData: function () {
      this.data = [];
    },
    read: function (filename) {
      var deferred = this.$q.defer();
      var me = this;
      me.load(filename).then(function (result) {
        me.data = result || [];
        deferred.resolve(me.data);
      }, function () {
        deferred.resolve(me.data);
      });
      return deferred.promise;
    },
    clear: function (filename) {
      var me = this;
      me.remove(filename).then(function () {
        me.data = [];
      });
    },
    save: function (filename, key, max, comparer) {
      if (!key || !$.trim(key)) {
        return;
      }

      var isExist = false;
      for (var i = 0; i < this.data.length; i++) {
        if (comparer) {
          isExist = comparer(key, this.data[i]);
        } else {
          isExist = key == this.data[i];
        }

        if (isExist) {
          this.data.splice(i, 1);
          break;
        }
      }

      max = max || 10;
      this.data = [key].concat(this.data);
      if (this.data.length > max) {
        this.data = this.data.slice(0, max);
      }
      this.write(filename, this.data, true);
    }
  }
);

whcyitCordovaModule.services.baiduMapAppService = whcyit.create({
  init: function ($cordovaToast) {
    this.$cordovaToast = $cordovaToast;
  },
  startMap: function (options) {
    if (!navigator.startApp) {
      return;
    }

    var url = "://map/marker?location=" + options.y + "," + options.x +
      "&title=" + options.title +
      "&content=" + options.content +
      "&src=whcyit|com.whcyit#Intent;scheme=bdapp;package=com.baidu.BaiduMap;end";
    var app = "baidumap://";
    var params = "baidumap" + url;
    if (ionic.Platform.isAndroid()) {
      app = "com.baidu.BaiduMap";
      params = [
        ["action", "VIEW"],
        ["bdapp" + url]
      ];
    }

    var me = this;
    navigator.startApp.check(app, function (message) {
      navigator.startApp.start(params, function (message) {
      }, function (error) {
        me.$cordovaToast.showLongTop('启动百度地图失败');
      });
    }, function (error) {
      me.$cordovaToast.showLongTop('请安装百度地图');
    });
  }
});

whcyit.initModule(whcyitCordovaModule);
