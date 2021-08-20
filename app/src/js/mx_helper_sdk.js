import {Worker} from './sdk/src/index.js';
import {MapxResolversApp, MapxResolversStatic} from './sdk/src/mapx_resolvers';

window.addEventListener('load', () => {
  mx.events.once({
    type: ['mapx_ready'],
    idGroup: 'sdk_binding',
    callback: () => {
      let resolvers;
      if (mx.settings.mode.static) {
        resolvers = new MapxResolversStatic({
          helpers: mx.helpers
        });
      } else {
        resolvers = new MapxResolversApp({
          helpers: mx.helpers
        });
      }
      window.mxsdkworker = new Worker({
        resolvers: resolvers,
        eventStore: mx.events
      });
    }
  });
});
