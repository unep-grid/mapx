export const config = {
  // public views
  idx_views: {
    primaryKey: "view_id",
    /**
     * Filterable attributes
     * ( facets + filter expressions )
     * https://www.meilisearch.com/docs/reference/api/settings#filterable-attributes
     */
    filterableAttributes: [
      "view_type",
      "source_keywords",
      "source_keywords_m49",
      "source_keywords_gemet_label",
      "projects_id",
      "range_start_at_year",
      "range_end_at_year",
      "view_modified_at",
      "view_created_at",
      "source_start_at",
      "source_end_at",
      "source_released_at",
      "source_modified_at",
    ],
    /**
     * Ranking rules
     * https://www.meilisearch.com/docs/learn/relevancy/ranking_rules
     */
    rankingRules: [
      "attribute", // searchableAttributes order >
      "exactness", // exact terms >
      "proximity", // small distance >
      "words", // number of matches >
      "typo", // fewer typo >
      "sort", // query time sort >
      "view_modified_at:asc",
    ],
    attributesStripHTML: ["view_abstract", "source_abstract"],
    /**
     * What is searchable
     * ( Also set importance )
     */
    searchableAttributes: [
      "view_title",
      "view_abstract",
      "source_title",
      "source_abstract",
      "source_keywords",
      "source_keywords_m49",
      "source_keywords_gemet",
      "source_keywords_m49_label",
      "source_keywords_gemet_label",
      "source_notes",
      "project_title",
      "project_abstract",
      "view_id",
      "project_id",
      "view_type",
      "view_modified_at",
      "view_created_at",
      "source_start_at",
      "source_end_at",
      "source_released_at",
      "source_modified_at",
      "range_start_at",
      "range_end_at",
      "range_start_at_year",
      "range_end_at_year",
      "range_years",
      "projects_data",
      "projects_id",
      "projects_title",
    ],
  },
};
