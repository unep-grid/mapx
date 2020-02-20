import {Worker} from './sdk/src/index.js';
import {MapxResolvers} from './sdk/src/mapx_resolvers.js';

window.addEventListener('load', () => {
  mx.events.once({
    type: ['mapx_ready'],
    idGroup: 'sdk_binding',
    callback: () => {
      const resolvers = new MapxResolvers({
          helpers:mx.helpers
        });
      window.mxsdkworker = new Worker({
        resolvers: resolvers
      });
    }
  });
});

