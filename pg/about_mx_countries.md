# mx_countries

## Citation

Administrative boundaries generalized by UNEP/GRID-Geneva (2019) based on the Global Administrative Unit Layers (GAUL) dataset (G2015_2014), implemented by FAO within the CountrySTAT and Agricultural Market Information System (AMIS) projects (2015).

## Additional notes

The generalization was made using Feature Manipulation Engine (FME) with the following settings:

- Algorithm: Douglas (generalize)
- Generalization Tolerance: 0.02
- Preserve Shared Boundaries: Yes
- Shared Boundaries Tolerance: None
- Preserve Path Segment: No

Geometries obtained from FME have been repaired in PostGIS using ST_MakeValid() function.

### Development stack

Starting with version 1.8.26, an oversimplified version of `mx_countries` is used in the development version of MapX.
It was generated with [mapshaper](https://mapshaper.org/) using the following parameters:

- import:
  - detect line intersections = true
  - snap vertices = true
- simplification:
  - prevent shape removal = true
  - method: Visvalingam / weighted area
  - percentage of removable points to retain: 3%

Once the simplification was done, the data was repaired in `mapshaper` and then in `QGIS 3.18` using the `Fix geometries` tool. All geometries are valid according to GEOS rules.

## Restrictions

You are free to modify and/or adapt any Data provided for your own use, reproduction as well as unlimited use within your organization. The Data is licensed and distributed by UNEP/GRID-Geneva. Redistribution to a Third party or reseller is formerly prohibited at any stage whatsoever by UNEP/GRID-Geneva.

## Disclaimer

Due to the generalization process, the administrative boundaries of the countries have been modified. Therefore, this dataset can only be used for unofficial cartographic purposes for global mapping using a scale not higher than 1:25 million. It should not be used in any way as a reference for national boundaries. Territorial information from this dataset do not imply the expression of any opinion whatsoever on the part of the UNEP/GRID-Geneva concerning the legal status of any country, territory, city or area, or of its authorities, or concerning the delimitation of its frontiers or boundaries. The Data is being delivered to you “AS IS” and UNEP/GRID-Geneva makes no warranty as to its use or performance.

UNEP/GRID-Geneva cannot be held responsible for a misuse of this file and its consequences.
