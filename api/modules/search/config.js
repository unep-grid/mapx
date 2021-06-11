const {validation_defaults} = require('@root/settings');
const languages = validation_defaults.languages;

const config = {
  // Distinct keywords currently used
  idx_keywords: {
    primaryKey: 'id_hash',
    searchableAttributes: ['keyword']
  },
  // All m49 keywords from dict in DB
  idx_keywords_m49: {
    primaryKey: 'id',
    searchableAttributes: ['id', ...languages.codes]
  },
  // public views
  idx_views: {
    primaryKey: 'view_id',
    atributesForFaceting: [
      'view_type',
      'source_keywords',
      'source_keywords_m49',
      'source_keywords_gemet',
    ],
    /**
     * Ranking rules
     * https://docs.meilisearch.com/learn/core_concepts/relevancy.html#ranking-rules
     */
    rankingRules: [
      'attribute', // searchableAttributes order >
      'exactness', // exact terms >
      'proximity', // small distance >
      'words', // number of matches >
      'wordsPosition', // position of words >
      'typo', // fewer typo >
      'asc(view_modified_at)'
    ],
    attributesStripHTML: ['view_abstract', 'source_abstract'],
    /**
     * What is searchable
     * ( Also set importance )
     */
    searchableAttributes: [
      'view_title',
      'view_abstract',
      'source_title',
      'source_abstract',
      'source_keywords',
      'source_keywords_m49',
      'source_keywords_gemet',
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
      'source_modified_at',
      'range_start_at',
      'range_end_at',
      'range_start_at_year',
      'range_end_at_year',
      'range_years',
      'projects_data'
    ]
  }
};

exports.config = config;
