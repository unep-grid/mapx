---
title : "Interactive Geospatial Analysis and Visualization with MapX SDK: Connecting to the MapX Ecosystem"
tags:
    - software development kit
    - environmental data
    - web platform integration
    - interoperability
    - geospatial
authors:
    - name: Frédéric Moser
      orcid: 0000-0001-6546-6344
      affiliation: 1
      corresponding: true
    - name: Antonio Benvenuti
      orcid: 0000-0002-4343-9879
      affiliation: 1
    - name: Cédric Gampert
      affiliation: 1
    - name: Thomas Piller
      orcid: 0009-0003-7760-4144
      affiliation: 1
    - name: Pierre Lacroix
      orcid: 0000-0002-9096-4414
      affiliation: "1, 2"
affiliations:
    - name: University of Geneva, Institute for Environmental Sciences, GRID-Geneva, Bd Carl-Vogt 66, CH-1211 Geneva, Switzerland
      index: 1
    - name: University of Geneva, Institute for Environmental Sciences, EnviroSPACE Lab., Bd Carl-Vogt 66, CH-1211 Geneva, Switzerland
      index: 2
date: 2024-04-11
bibliography: paper.bib
---

# Summary

The `mxsdk` package is written in JavaScript. It exposes a web-based SDK that enhances the MapX geospatial web platform, introducing an asynchronous messaging system and an `iframe` lifecycle manager for easy integration of MapX features into web pages or applications using frameworks such as React. It provides a comprehensive suite of methods for data retrieval,  map customization, and control over core functionalities. The MapX SDK is supported by detailed [documentation](https://github.com/unep-grid/mapx/tree/main/app/src/js/sdk/readme.md) that includes events, methods, and examples, empowering developers to leverage MapX's geospatial and scientific visualization capabilities, such as map layers and dashboards, in their projects.

```sh 
# MapX SDK high-level architectural diagram
   ┌─────────────────────────┐                        
   │         MapX SDK        │                        
   │  ┌────────────┬─▲────┐  │                        
   │  │      iframe│ │    │  │      ┌──────────────┐  
   │  │  ┌─────────▼─┴─┐  │  │      │  PostgreSQL  │  
   │  │  │    MapX     │  │  │      │  NodeJS      │  
   │  │  │  ┌───────┐  │  │  │      │  R           │  
   │  │  │  │       │  │  │  │      │  Redis       │  
   │  │  │  │  map  │  │  │  │      │  MeiliSearch │  
   │  │  │  │       │  │  │  │      │  GeoServer   │  
   └──┴──┴──┴───────┴─▲└──┴──┘      └──────▲───────┘  
                      │                    │          
                      └────────────────────┘

```

<!---
https://asciiflow.com/#/local/mapx_SDK
-->


# Statement of Need

[MapX](https://unepgrid.ch/en/mapx) is a geospatial platform managed by [UNEP/GRID-Geneva](https://www.unepgrid.ch/) that enables the management, analysis, and visualization of a curated catalog of scientific geospatial data on natural resources and the environment [@lacroix_mapx_2019]. Its main objective is to promote the use of such data in environmental decision-making for sustainable use of natural resources, in alignment with the United Nations Environment Program's mandate [@unep_site]. MapX facilitates access to a global public catalog of high-quality spatial information on environmental topics such as biodiversity planning, chemicals management, climate change, disaster risk reduction, environmental security, extractive industries, land use planning, and renewable energy. 

Currently, MapX hosts over 2000 curated GIS layers and tables, sourced from reputable data providers such as the @un_gis_site, @jrc_site, @sedac_site, @wcmc_site, @nasa_data_site, @wri_site, @protected_planet_site, and many more, covering needs from local to global scales. To date, 4000 registered scientists and publishers have created accounts on MapX. Notably, UNEP partners and other institutions collaborate with, or use MapX to contextualize their work and to promote the outcomes of their projects within a geospatial framework.

In this context, the MapX SDK has a crucial role:

1. **Scientific Data Diffusion**
   - It facilitates the integration of scientific, curated, up-to-date data into web pages or applications, ensuring that developers have seamless access to high-quality geospatial information.

2. **Abstraction**
   - It offers an abstraction layer for integrating complex geospatial visualizations and interactive dashboards. This abstraction simplifies the process of incorporating advanced data representations into user interfaces.

3. **Customization**
   - It supports custom user interface development and integration with frameworks like [React](https://unep-grid.github.io/mapx-demo/examples/app_react/index.html). This enables developers to tailor applications to specific needs while leveraging the robust capabilities of MapX.

4. **Data Visualization**
   - It supports the creation of new ways of data visualization, such as navigating through geospatial data using [custom controls](https://unep-grid.github.io/mapx-demo/examples/static_joystick/index.html). This enhances data exploration capabilities and attractiveness.

# Description of the MapX SDK

Simple examples of instantiation of the most used MapX SDK methods are available for developers and can be consulted in the [MapX demo project](https://unep-grid.github.io/mapx-demo/index.html) and [Observable](https://observablehq.com/@trepmag/mapx-sdk-introduction?collection=@trepmag/mapx-sdk).

Currently, 130 methods and 24 events are supported by the SDK. These allow to perform a comprehensive set of operations, including among others:

1. Initialize a MapX SDK instance, targeting a MapX endpoint such as [app.mapx.org](https://app.mapx.org/static.html?language=en&views=MX-JH8E4-MZKY6-WNG6M&zoomToViews=false&p=73.184&b=75.699&z=13.498&lat=35.66&lng=69.887&t3d=true&sat=true&theme=water_dark&globe=true);
2. Setting up the layout and elements that are to be displayed;
3. Triggering features – depending on the current mode, displaying metadata, initialize a download, displaying the login prompt, setting the language, etc. 
4. Interacting directly with the map object, its base layers and the style of various elements;
5. Fine tuning the theme used by MapX, including web fonts and glyphs in the web-gl map;
6. Activating `views` and displaying their layers on the map, displaying their legends, and if any, their widgets in the dashboard;
7. Interacting with the panel management system;
8. Using the `common_loc` system to move the map context to a set of predefined locations;
9. Retrieving metadata to be displayed in the host, outside the instance;
10. Injecting GeoJSON layer on the map, creating a temporary `view`; 

All requests to MapX are handled by a queuing system which allows a simultaneous management of the requests to MapX and avoids the host being blocked while waiting for long requests to terminate. 

The MapX SDK is publicly available and does not require any affiliation to MapX for those who want to integrate the public MapX geospatial database and use its functions in their own environments. At the time of writing, the SDK is used in platforms that target the status of natural resources and their related hazards, such as: Opportunity Mapping [@unepgrid_opportinity_site], which shows ecosystems relevant for protection against natural hazards; and the Global Infrastructure Risk Model and Index [@unepgrid_giri_site], which provides a comprehensive view of exposure to natural hazards and related risks. In addition to these platforms, the SDK has been used to bridge MapX with Apache Superset [@superset] to display MapX data in a Superset environment. A plugin named `superset-plugin-chart-mapx` is publicly available for Superset users [@superset_mapx_2021]. This plugin has been successfully used on several occasions, one of which is the [Interactive Country Fiches platform](https://dicf.unepgrid.ch/afghanistan/water#section-impacts) [@unepgrid_dicf_site] developed for the European Commission.

# Tests

We opted for a custom framework, that focuses on randomized end-to-end stress testing. Currently, it requires an encrypted token, a working MapX local endpoint, and an extensive set of data, as these are mandatory for some operations, such as a stress test on the MapX collaborative real-time data table editor.

There are 40 blocks of tests and a total of 73 individual tests, with many sub-tests. The results are currently displayed in the browser used for testing. A preview is available [here](https://owncloud.unepgrid.ch/index.php/s/Om82KpD5UUdZLcM/download).

```js
/**
* The tests are run before each release.
* From the repository root
*/
cd app/src/js/sdk
npm run test
```

# Minimalist example

This example demonstrates how to import the most recent version of the `mxsdk` package and instantiate a MapX instance. It uses a default theme and points to a workspace specified by the "project" parameter.

- `script.js`
```js 
import { Manager } from "https://app.mapx.org/sdk/mxsdk.modern.js";

const mapx = new Manager({
  container: document.getElementById("mapx"),
  verbose: true,
  url: "https://app.mapx.org:443",
  params: { theme: "color_light", project: "MX-YBJ-YYF-08R-UUR-QW6" },
});

mapx.on("ready", () => {
  console.log("ready!");
});
```

- `style.css`
```css 

html, body, #mapx {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}
```

- `index.html`
```html 
<!DOCTYPE html>
<html lang="en">
<head>
    <title>MapX SDK</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="mapx"></div>
    <script type="module" src="script.js"></script>
</body>
</html>
```


# Author contributions

- Frédéric Moser: Conceptualization, development, documentation and paper revision.
- Antonio Benvenuti: Paper writing.
- Cédric Gampert: Testing and use cases development.
- Thomas Piller: Conceptualization, testing and use cases development.
- Pierre Lacroix: Manager, fund raising, use cases development and paper writing.

# Acknowledgements

We would like to acknowledge the United Nations Environment Program that partially funded the development of the work presented in this paper.

# References
