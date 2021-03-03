"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _perf_hooks = require("perf_hooks");

var _logger = _interopRequireDefault(require("@wdio/logger"));

var _nodeTunnel = _interopRequireDefault(require("@lambdatest/node-tunnel"));

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const log = (0, _logger.default)('@wdio/lambdatest-service');

class LambdaTestLauncher {
  constructor(options) {
    this.options = options;
  }

  onPrepare(config, capabilities) {
    if (!this.options.tunnel) {
      return;
    }

    const tunnelArguments = _objectSpread({
      user: config.user,
      key: config.key
    }, this.options.lambdatestOpts);

    this.lambdatestTunnelProcess = new _nodeTunnel.default();

    if (Array.isArray(capabilities)) {
      capabilities.forEach(capability => {
        capability.tunnel = true;
      });
    } else if (typeof capabilities === 'object') {
      capabilities.tunnel = true;
    }

    const obs = new _perf_hooks.PerformanceObserver(list => {
      const entry = list.getEntries()[0];
      log.info(`LambdaTest Tunnel successfully started after ${entry.duration}ms`);
    });
    obs.observe({
      entryTypes: ['measure'],
      buffered: false
    });
    let timer;

    _perf_hooks.performance.mark('ltTunnelStart');

    return Promise.race([new Promise((resolve, reject) => {
      this.lambdatestTunnelProcess.start(tunnelArguments, err => {
        if (err) return reject(err);
        this.lambdatestTunnelProcess.getTunnelName(tunnelName => {
          if (Array.isArray(capabilities)) {
            capabilities.forEach(capability => {
              capability.tunnelName = tunnelName;
            });
          } else if (typeof capabilities === 'object') {
            capabilities.tunnelName = tunnelName;
          }

          resolve();
        });
      });
    }), new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error(_constants.TUNNEL_START_FAILED));
      }, _constants.TUNNEL_STOP_TIMEOUT);
    })]).then(result => {
      clearTimeout(timer);

      _perf_hooks.performance.mark('ltTunnelEnd');

      _perf_hooks.performance.measure('bootTime', 'ltTunnelStart', 'ltTunnelEnd');

      return Promise.resolve(result);
    }, err => {
      clearTimeout(timer);
      return Promise.reject(err);
    });
  }

  onComplete() {
    if (!this.lambdatestTunnelProcess || typeof this.lambdatestTunnelProcess.isRunning !== 'function' || !this.lambdatestTunnelProcess.isRunning()) {
      return;
    }

    let timer;
    return Promise.race([new Promise((resolve, reject) => {
      this.lambdatestTunnelProcess.stop(err => {
        if (err) return reject(err);
        resolve();
      });
    }), new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(_constants.TUNNEL_STOP_FAILED)), _constants.TUNNEL_STOP_TIMEOUT);
    })]).then(() => {
      clearTimeout(timer);
      return Promise.resolve();
    }, err => {
      clearTimeout(timer);
      return Promise.reject(err);
    });
  }

}

exports.default = LambdaTestLauncher;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9sYXVuY2hlci5qcyJdLCJuYW1lcyI6WyJsb2ciLCJMYW1iZGFUZXN0TGF1bmNoZXIiLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJvblByZXBhcmUiLCJjb25maWciLCJjYXBhYmlsaXRpZXMiLCJ0dW5uZWwiLCJ0dW5uZWxBcmd1bWVudHMiLCJ1c2VyIiwia2V5IiwibGFtYmRhdGVzdE9wdHMiLCJsYW1iZGF0ZXN0VHVubmVsUHJvY2VzcyIsIkxhbWJkYVRlc3RUdW5uZWxMYXVuY2hlciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJjYXBhYmlsaXR5Iiwib2JzIiwiUGVyZm9ybWFuY2VPYnNlcnZlciIsImxpc3QiLCJlbnRyeSIsImdldEVudHJpZXMiLCJpbmZvIiwiZHVyYXRpb24iLCJvYnNlcnZlIiwiZW50cnlUeXBlcyIsImJ1ZmZlcmVkIiwidGltZXIiLCJwZXJmb3JtYW5jZSIsIm1hcmsiLCJQcm9taXNlIiwicmFjZSIsInJlc29sdmUiLCJyZWplY3QiLCJzdGFydCIsImVyciIsImdldFR1bm5lbE5hbWUiLCJ0dW5uZWxOYW1lIiwic2V0VGltZW91dCIsIkVycm9yIiwiVFVOTkVMX1NUQVJUX0ZBSUxFRCIsIlRVTk5FTF9TVE9QX1RJTUVPVVQiLCJ0aGVuIiwicmVzdWx0IiwiY2xlYXJUaW1lb3V0IiwibWVhc3VyZSIsIm9uQ29tcGxldGUiLCJpc1J1bm5pbmciLCJzdG9wIiwiVFVOTkVMX1NUT1BfRkFJTEVEIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7OztBQUNBLE1BQU1BLEdBQUcsR0FBRyxxQkFBTywwQkFBUCxDQUFaOztBQUNlLE1BQU1DLGtCQUFOLENBQXlCO0FBQ3BDQyxFQUFBQSxXQUFXLENBQUNDLE9BQUQsRUFBVTtBQUNqQixTQUFLQSxPQUFMLEdBQWVBLE9BQWY7QUFDSDs7QUFHREMsRUFBQUEsU0FBUyxDQUFDQyxNQUFELEVBQVNDLFlBQVQsRUFBdUI7QUFD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cmZvcm1hbmNlLCBQZXJmb3JtYW5jZU9ic2VydmVyIH0gZnJvbSAncGVyZl9ob29rcydcbmltcG9ydCBsb2dnZXIgZnJvbSAnQHdkaW8vbG9nZ2VyJ1xuaW1wb3J0IExhbWJkYVRlc3RUdW5uZWxMYXVuY2hlciBmcm9tICdAbGFtYmRhdGVzdC9ub2RlLXR1bm5lbCdcbmltcG9ydCB7IFRVTk5FTF9TVEFSVF9GQUlMRUQsIFRVTk5FTF9TVE9QX0ZBSUxFRCwgVFVOTkVMX1NUT1BfVElNRU9VVCB9IGZyb20gJy4vY29uc3RhbnRzJ1xuY29uc3QgbG9nID0gbG9nZ2VyKCdAd2Rpby9sYW1iZGF0ZXN0LXNlcnZpY2UnKVxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGFtYmRhVGVzdExhdW5jaGVyIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnNcbiAgICB9XG5cbiAgICAvLyBtb2RpZnkgY29uZmlnIGFuZCBsYXVuY2ggdHVubmVsXG4gICAgb25QcmVwYXJlKGNvbmZpZywgY2FwYWJpbGl0aWVzKSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnR1bm5lbCkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0dW5uZWxBcmd1bWVudHMgPSB7XG4gICAgICAgICAgICB1c2VyOiBjb25maWcudXNlcixcbiAgICAgICAgICAgIGtleTogY29uZmlnLmtleSxcbiAgICAgICAgICAgIC4uLnRoaXMub3B0aW9ucy5sYW1iZGF0ZXN0T3B0c1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYW1iZGF0ZXN0VHVubmVsUHJvY2VzcyA9IG5ldyBMYW1iZGFUZXN0VHVubmVsTGF1bmNoZXIoKVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNhcGFiaWxpdGllcykpIHtcbiAgICAgICAgICAgIGNhcGFiaWxpdGllcy5mb3JFYWNoKGNhcGFiaWxpdHkgPT4ge1xuICAgICAgICAgICAgICAgIGNhcGFiaWxpdHkudHVubmVsID0gdHJ1ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY2FwYWJpbGl0aWVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY2FwYWJpbGl0aWVzLnR1bm5lbCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICAvLyBtZWFzdXJlIExUIGJvb3QgdGltZVxuICAgICAgICBjb25zdCBvYnMgPSBuZXcgUGVyZm9ybWFuY2VPYnNlcnZlcihsaXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gbGlzdC5nZXRFbnRyaWVzKClbMF1cbiAgICAgICAgICAgIGxvZy5pbmZvKFxuICAgICAgICAgICAgICAgIGBMYW1iZGFUZXN0IFR1bm5lbCBzdWNjZXNzZnVsbHkgc3RhcnRlZCBhZnRlciAke2VudHJ5LmR1cmF0aW9ufW1zYFxuICAgICAgICAgICAgKVxuICAgICAgICB9KVxuICAgICAgICBvYnMub2JzZXJ2ZSh7IGVudHJ5VHlwZXM6IFsnbWVhc3VyZSddLCBidWZmZXJlZDogZmFsc2UgfSlcblxuICAgICAgICBsZXQgdGltZXJcbiAgICAgICAgcGVyZm9ybWFuY2UubWFyaygnbHRUdW5uZWxTdGFydCcpXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMubGFtYmRhdGVzdFR1bm5lbFByb2Nlc3Muc3RhcnQodHVubmVsQXJndW1lbnRzLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYW1iZGF0ZXN0VHVubmVsUHJvY2Vzcy5nZXRUdW5uZWxOYW1lKHR1bm5lbE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2FwYWJpbGl0aWVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllcy5mb3JFYWNoKGNhcGFiaWxpdHkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXR5LnR1bm5lbE5hbWUgPSB0dW5uZWxOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNhcGFiaWxpdGllcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXMudHVubmVsTmFtZSA9IHR1bm5lbE5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICAgICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7IHJlamVjdCggbmV3IEVycm9yKFRVTk5FTF9TVEFSVF9GQUlMRUQpKSB9LCBUVU5ORUxfU1RPUF9USU1FT1VUKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgXSkudGhlbihcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgICAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICAgICAgICAgIHBlcmZvcm1hbmNlLm1hcmsoJ2x0VHVubmVsRW5kJylcbiAgICAgICAgICAgICAgICBwZXJmb3JtYW5jZS5tZWFzdXJlKCdib290VGltZScsICdsdFR1bm5lbFN0YXJ0JywgJ2x0VHVubmVsRW5kJylcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpXG4gICAgICAgICAgICB9XG4gICAgICAgIClcbiAgICB9XG5cbiAgICBvbkNvbXBsZXRlKCkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAhdGhpcy5sYW1iZGF0ZXN0VHVubmVsUHJvY2VzcyB8fFxuICAgICAgICAgICAgdHlwZW9mIHRoaXMubGFtYmRhdGVzdFR1bm5lbFByb2Nlc3MuaXNSdW5uaW5nICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgICAgICAhdGhpcy5sYW1iZGF0ZXN0VHVubmVsUHJvY2Vzcy5pc1J1bm5pbmcoKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRpbWVyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMubGFtYmRhdGVzdFR1bm5lbFByb2Nlc3Muc3RvcChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdCggbmV3IEVycm9yKFRVTk5FTF9TVE9QX0ZBSUxFRCkpLCBUVU5ORUxfU1RPUF9USU1FT1VUKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgXSkudGhlbihcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycilcbiAgICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgIH1cbn0iXX0=