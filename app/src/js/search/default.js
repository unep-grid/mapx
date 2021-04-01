const def = {
  key: null,
  host: 'localhost',
  port: 80,
  container: '#idcontainer',
  language: 'en',
  index: 'views',
  filters: {
    op_compare: ['=', '!=', '>', '>=', '<', '<='],
    op_logic: ['AND', 'OR', 'NOT'],
    op_nest: ['\\(', '\\)'],
    date: [
      'view_modified_at',
      'view_created_at',
      'source_start_at',
      'source_end_at',
      'source_released_at',
      'source_modified_at'
    ],
    searchable: [
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
      'view_type',
      'view_modified_at',
      'view_created_at',
      'source_start_at',
      'source_end_at',
      'source_released_at',
      'source_modified_at'
    ]
  },
  index_setting: {
    views: {
      //facetsDistribution: [
      //'view_type',
      //'source_keywords',
      //'source_keywords_m49'
      //],
      attributesToHighlight: [
        'view_title',
        'view_abstract',
        'source_title',
        'source_abstract'
      ]
    }
  }
};

export {def};
