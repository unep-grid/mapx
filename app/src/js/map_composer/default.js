import {el} from '@fxi/el';

let state = {
  unit: 'px',
  units: ['mm', 'in', 'px'],
  modes : ['layout','preview'],
  modes_internal : ['print','layout','preview'],
  dpi: 300,
  mode :'layout',
  page_width: 600,
  page_height: 600,
  content_scale: 1,
  legend_n_columns: 1,
  grid_snap_size: 5,
  item_height: 10,
  item_width: 10,
  workspace_height: 200,
  workspace_width: 200,
  canvas_max_area : 268435456,
  device_pixel_ratio_orig : window.devicePixelRatio,
  device_pixel_ratio : 2,
  items: [
    {
      type: 'map',
      width: 50,
      height: 20,
      options: {},
      editable : false
    },
    {
      type: 'legend',
      element: el('ul', el('li', el('label','editable'))),
      width: 5,
      height: 10,
      editable : true
    },
    {
      type: 'title',
      text: 'Title',
      width: 40,
      height: 4,
      editable : true
    },
    {
      type: 'text',
      text: 'Abstract',
      width: 20,
      height: 4,
      editable : true
    }
  ]
};

export {state};
