const def = {
  key: null,
  host: 'localhost',
  port: 80,
  protocol:'',
  container: '#idcontainer',
  language: 'en',
  index_template: 'views_{{language}}',
  index: 'views_en',
  meili : {
    index_setting:{}
  },
  attributes: {
    date: [
      'view_modified_at',
      'view_created_at',
      'source_start_at',
      'source_end_at',
      'source_released_at',
      'source_modified_at'
    ],
    text: [
      'view_title',
      'view_abstract',
      'source_title',
      'source_abstract',
      'source_keywords',
      'source_keywords_m49',
      'source_notes',
      'project_title',
      'project_abstract',
      'view_id',
      'project_id',
      'view_type'
    ],
    facets: ['source_keywords', 'source_keywords_m49', 'view_type']
  }
};

export {def};
