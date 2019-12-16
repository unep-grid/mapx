import {Worker} from './sdk/src/index.js';

window.addEventListener('load', () => {
  mx.events.once({
    type: ['mapx_ready'],
    idGroup: 'sdk_binding',
    callback: () => {
      window.mxsdkworker = new Worker({
        resolvers: getResolver()
      });
    }
  });
});

function  getResolver (){
  const h = mx.helpers;
  return {
    get_views: () => {
      return h.getViewsForJSON();
    },
    get_user_id: () => {
      return mx.settings.user.id;
    },
    get_ip : () => {
      return fetch('https://api.mapx.org/get/ip').then(r => r.json());
    },
    set_project : (idProject) => {
      return h.setProject(idProject);
    }
  };
}

