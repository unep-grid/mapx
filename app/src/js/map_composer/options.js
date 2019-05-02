import {el} from '@fxi/el';

let print = {
  dpi: 300
};

let layout = {
  resolution: [10, 10],
  page: {
    width: 50,
    height: 50
  },
  legends : {
    columnWidth : 15
  },
  workspace: {
    width: 100,
    height: 100
  },
  item: {
    width: 5,
    height: 5
  }
};

let items = [
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
];

export {print, layout, items};
