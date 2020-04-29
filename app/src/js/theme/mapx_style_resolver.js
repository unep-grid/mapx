export function css_resolver(c) {
  return `
  * {
  --mx_ui_text: ${c.mx_ui_text};
  --mx_ui_text_faded: ${c.mx_ui_text_faded};
  --mx_ui_hidden: ${c.mx_ui_hidden};
  --mx_ui_border: ${c.mx_ui_border};
  --mx_ui_background: ${c.mx_ui_background};
  --mx_ui_shadow: ${c.mx_ui_shadow};
  --mx_ui_link: ${c.mx_ui_link};
  border-color: var(--mx_ui_border);
  color: var(--mx_ui_text);
}`;
}

export function layer_resolver(c) {
  return [
    {
      id: ['background'],
      paint: {
        'background-color': c.mx_map_background
      }
    },
    {
      id: ['hillshading'],
      paint: {
        "hillshade-accent-color": c.mx_map_hillshade_accent,
        "hillshade-highlight-color": c.mx_map_hillshade_highlight,
        "hillshade-shadow-color": c.mx_map_hillshade_shadow
      }
    },
    {
      id: ['maritime'],
      paint: {
        'line-color': c.mx_map_background
      }
    },
    {
      id: ['water'],
      paint: {
        'fill-color': c.mx_map_water,
        'fill-outline-color': c.mx_map_water
      }
    },
    {
      id: ['waterway'],
      paint: {
        'line-color': c.mx_map_water
      }
    },
    {
      id: ['country-code'],
      paint: {
        'fill-color': c.mx_map_mask
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
      paint: {
        'line-color': c.mx_map_road
      }
    },
    {
      id: ['road-pedestrian-polygon', 'road-polygon'],
      paint: {
        'fill-color': c.mx_map_road
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
      paint: {
        'line-color': c.mx_map_road_border
      }
    },
    {
      id: ['building'],
      paint: {
        'fill-color': c.mx_map_building
      }
    },
    {
      id: ['boundary_un_1'],
      paint: {
        'line-color': c.mx_map_boundary_un_1
      }
    },
    {
      id: ['boundary_un_2'],
      paint: {
        'line-color': c.mx_map_boundary_un_2
      }
    },
    {
      id: ['boundary_un_3'],
      paint: {
        'line-color': c.mx_map_boundary_un_3
      }
    },
    {
      id: ['boundary_un_4'],
      paint: {
        'line-color': c.mx_map_boundary_un_4
      }
    },
    {
      id: ['boundary_un_8'],
      paint: {
        'line-color': c.mx_map_boundary_un_8
      }
    },
    {
      id: ['boundary_un_9'],
      paint: {
        'line-color': c.mx_map_boundary_un_9
      }
    },
    {
      id: ['boundary_osm_subnational_3_4'],
      paint: {
        'line-color': c.mx_map_boundary_osm_subnational_3_4
      }
    },
    {
      id: [
        'place-label-capital',
        'place-label-city',
        'country-label',
        'road-label',
        'road-label-small',
        'road-label-medium',
        'road-label-large'
      ],
      paint: {
        'text-color': c.mx_map_text,
        'text-halo-color': c.mx_map_text_outline
      }
    },
    {
      id: [
        'place-label-capital',
        'place-label-city',
        'country-label',
        'road-label',
        'road-label-small',
        'road-label-medium',
        'road-label-large'
      ],
      paint: {
        'text-color': c.mx_map_text,
        'text-halo-color': c.mx_map_text_outline
      }
    }
  ];
}
