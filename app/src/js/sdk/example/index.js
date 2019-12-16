import {Manager} from '../src/index.js';

const mxsdk = new Manager({
  //url:   'http://dev.mapx.localhost:8880/static.html?project=MX-HPP-OWB-3SI-3FF-Q3R&views=MX-T8GJQ-GIC8X-AHLA9&zoomToViews=true&lat=-4.087&lng=21.754&z=4.886'
  url : 'http://dev.mapx.localhost:8880/?project=MX-HPP-OWB-3SI-3FF-Q3R&language=en'
});

mxsdk.on('ready', () => {
   mxsdk.ask('get_views').then(r => console.log(r));
   mxsdk.ask('get_ip').then(r => console.log(r));
   setTimeout(()=>{
     mxsdk.ask('set_project','MX-JZL-FJV-RLN-7OH-QLU');
   }, 3000);
});
