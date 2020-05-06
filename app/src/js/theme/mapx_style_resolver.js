import * as color_utils from './../color_utils';

export function css_resolver(c) {
  return `
  * {
  --mx_ui_text: ${v(c.mx_ui_text)};
  --mx_ui_text_faded: ${v(c.mx_ui_text_faded)};
  --mx_ui_hidden: ${v(c.mx_ui_hidden)};
  --mx_ui_border: ${v(c.mx_ui_border)};
  --mx_ui_background: ${v(c.mx_ui_background)};
  --mx_ui_shadow: ${v(c.mx_ui_shadow)};
  --mx_ui_link: ${v(c.mx_ui_link)};
  border-color: var(--mx_ui_border);
  color: var(--mx_ui_text);
}`;
}

function v(col) {
  const hide = !col.visibility || col.visibility !== 'visible';
  const obj = color_utils.color2obj(col.color || col);
  if (hide) {
    obj.alpha = 0;
  }
  const rgba = color_utils.hex2rgba(obj.color, obj.alpha);
  return rgba;

}

export function layer_resolver(c) {
  return [
    {
      id: ['background'],
      layout: {
        visibility: c.mx_map_background.visibility
      },
      paint: {
        'background-color': c.mx_map_background.color
      }
    },
    {
      id: ['hillshading'],
      layout: {
        visibility: allVisible([
          c.mx_map_hillshade_accent.visibility,
          c.mx_map_hillshade_highlight.visibility,
          c.mx_map_hillshade_shadow.visibility
        ])
      },
      paint: {
        'hillshade-accent-color': c.mx_map_hillshade_accent.color,
        'hillshade-highlight-color': c.mx_map_hillshade_highlight.color,
        'hillshade-shadow-color': c.mx_map_hillshade_shadow.color
      }
    },
    {
      id: ['maritime'],
      layout: {
        visibility: c.mx_map_background.visibility
      },
      paint: {
        'line-color': c.mx_map_background.color
      }
    },
    {
      id: ['water'],
      layout: {
        visibility: c.mx_map_water.visibility
      },
      paint: {
        'fill-color': c.mx_map_water.color
      }
    },
    {
      id: ['bathymetry'],
      layout: {
        visibility: c.mx_map_water.visibility
      },
      paint: {
        'fill-color': c.mx_map_water.color,
        'fill-opacity': 0.2
      }
    },
    {
      id: ['waterway'],
      layout: {
        visibility: c.mx_map_water.visibility
      },
      paint: {
        'line-color': c.mx_map_water.color
      }
    },
    {
      id: ['country-code'],
      layout: {
        visibility: c.mx_map_mask.visibility
      },
      paint: {
        'fill-color': c.mx_map_mask.color
      }
    },
    {
      id: [
        'road-street-low',
        'road-street_limited-low',
        'road-path',
        'road-construction',
        'road-trunk_link',
        'road-motorway_link',
        'road-service-link-track',
        'road-street_limited',
        'road-street',
        'road-secondary-tertiary',
        'road-primary',
        'road-trunk',
        'road-motorway',
        'road-rail',
        'road-rail-tracks'
      ],
      layout: {
        visibility: c.mx_map_road.visibility
      },
      paint: {
        'line-color': c.mx_map_road.color
      }
    },
    {
      id: ['road-pedestrian-polygon', 'road-polygon'],
      layout: {
        visibility: c.mx_map_road.visibility
      },
      paint: {
        'fill-color': c.mx_map_road.color
      }
    },
    {
      id: [
        'road-pedestrian-polygon-case',
        'road-service-link-track-case',
        'road-street_limited-case',
        'road-street-case',
        'road-secondary-tertiary-case',
        'road-primary-case',
        'road-motorway_link-case',
        'road-trunk_link-case',
        'road-trunk-case',
        'road-motorway-case'
      ],
      layout: {
        visibility: c.mx_map_road_border.visibility
      },
      paint: {
        'line-color': c.mx_map_road_border.color
      }
    },
    {
      id: ['building'],
      layout: {
        visibility: c.mx_map_building.visibility
      },
      paint: {
        'fill-color': c.mx_map_building.color
      }
    },
    {
      id: ['boundary_un_1'],
      layout: {
        visibility: c.mx_map_boundary_un_1.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_1.color
      }
    },
    {
      id: ['boundary_un_2'],
      layout: {
        visibility: c.mx_map_boundary_un_1.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_2.color
      }
    },
    {
      id: ['boundary_un_3'],
      layout: {
        visibility: c.mx_map_boundary_un_3.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_3.color
      }
    },
    {
      id: ['boundary_un_4'],
      layout: {
        visibility: c.mx_map_boundary_un_4.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_4.color
      }
    },
    {
      id: ['boundary_un_8'],
      layout: {
        visibility: c.mx_map_boundary_un_8.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_8.color
      }
    },
    {
      id: ['boundary_un_9'],
      layout: {
        visibility: c.mx_map_boundary_un_9.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_9.color
      }
    },
    {
      id: ['boundary_osm_subnational'],
      layout: {
        visibility: c.mx_map_boundary_osm_subnational.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_osm_subnational.color
      }
    },
    {
      id: [
        'place-label-capital',
        'place-label-city',
        'country-label',
        'water-label'
      ],
      layout: {
        visibility: allVisible([
          c.mx_map_text_place.visibility,
          c.mx_map_text_place_outline.visibility
        ])
      },
      paint: {
        'text-color': c.mx_map_text_place.color,
        'text-halo-color': c.mx_map_text_place_outline.color,
        'icon-color': c.mx_map_text_place.color
      }
    },
    {
      id: ['road-label'],
      layout: {
        visibility: allVisible([
          c.mx_map_text_road.visibility,
          c.mx_map_text_road_outline.visibility
        ])
      },
      paint: {
        'text-color': c.mx_map_text_road.color,
        'text-halo-color': c.mx_map_text_road_outline.color
      }
    }
  ];
}

function allVisible(arr) {
  const v = arr.reduce((a, c) => {
    return a === true && c === 'visible';
  }, true);
  return v ? 'visible' : 'none';
}
