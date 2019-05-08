import {el} from '@fxi/el';

let state = {
  unit: 'mm',
  units: ['mm', 'in', 'px'],
  dpi: 300,
  mode :'layout',
  mode_preview: false,
  page_width: 100,
  page_height: 100,
  content_scale: 1,
  legend_n_columns: 1,
  grid_snap_size: 1,
  item_height: 10,
  item_width: 10,
  workspace_height: 200,
  workspace_width: 200,
  canvas_max_area : 268435456,
  items: [
    {
      type: 'map',
      width: 20,
      height: 20,
      options: {}
    },
    {
      type: 'legend',
      element: el('ul', el('li', 'legend')),
      width: 5,
      height: 10
    },
    {
      type: 'title',
      text: 'Title',
      width: 40,
      height: 4
    },
    {
      type: 'text',
      text: 'Abstract',
      width: 20,
      height: 4
    }
  ]
};

export {state};
