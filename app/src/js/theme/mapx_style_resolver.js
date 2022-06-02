import chroma from 'chroma-js';

export function css_resolver(c) {
  return `
  * {
  --mx_ui_text: ${v(c.mx_ui_text)};
  --mx_ui_text_faded: ${v(c.mx_ui_text_faded)};
  --mx_ui_hidden: ${v(c.mx_ui_hidden)};
  --mx_ui_border: ${v(c.mx_ui_border)};
  --mx_ui_background: ${v(c.mx_ui_background)};
  --mx_ui_background_faded: ${v(c.mx_ui_background_faded)};
  --mx_ui_background_contrast: ${v(c.mx_ui_background_contrast)};
  --mx_ui_background_accent: ${v(c.mx_ui_background_accent)};
  --mx_ui_background_transparent: ${v(c.mx_ui_background_transparent)};
  --mx_ui_shadow: ${v(c.mx_ui_shadow)};
  --mx_ui_link: ${v(c.mx_ui_link)};
  --mx_ui_input_accent: ${v(c.mx_ui_input_accent)};
  border-color: var(--mx_ui_border);
  color: var(--mx_ui_text);
}`;
}

function v(col) {
  const hide = !col.visibility || col.visibility !== 'visible';
  const isStringCol = typeof col === 'string';
  const color = isStringCol ? col : col.color;
  const chromaColor = chroma(color);
  if (hide) {
    return chromaColor.alpha(0).css();
  }
  const alpha = (isStringCol || !col.alpha ) ? chromaColor.alpha() : col.alpha;
  return chromaColor.alpha(alpha).css();
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
          c.mx_map_hillshade_shadow.visibility,
          c.mx_map_hillshade_highlight.visibility
        ])
      },
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'highlight',
          c.mx_map_hillshade_highlight.color,
          'shadow',
          c.mx_map_hillshade_shadow.color,
          'hsla(0, 0%, 0%, 0)'
        ]
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
        visibility: allVisible([
          c.mx_map_bathymetry_low.visibility,
          c.mx_map_bathymetry_high.visibility
        ])
      },
      paint: {
        'fill-color': [
          'interpolate',
          ['cubic-bezier', 0, 0.5, 1, 0.5],
          ['get', 'depth'],
          200,
          c.mx_map_bathymetry_high.color,
          9000,
          c.mx_map_bathymetry_low.color
        ]
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
      id: ['boundary_un_6'],
      layout: {
        visibility: c.mx_map_boundary_un_6.visibility
      },
      paint: {
        'line-color': c.mx_map_boundary_un_6.color
      }
    },
    {
      id: [
        'place-label-capital',
        'place-label-city',
        'country-label'
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
      id: ['water-label-point', 'water-label-line'],
      layout: {
        visibility: allVisible([
          c.mx_map_text_water.visibility,
          c.mx_map_text_water_outline.visibility
        ])
      },
      paint: {
        'text-color': c.mx_map_text_water.color,
        'text-halo-color': c.mx_map_text_water_outline.color,
        'icon-color': c.mx_map_text_water.color
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
