# OGC Services Documentation

This guide explains how to access various OGC (Open Geospatial Consortium) services.

## Services

### WMS (Web Map Service)

WMS provides map images.


```
{{host}}/{{project}}/wms?
STYLES=&
LAYERS={{layer}}&
FORMAT=image/png&
SERVICE=WMS&
VERSION=1.3.0&
REQUEST=GetMap&
CRS=EPSG:4326&
BBOX={{bbox}}&
WIDTH=512&HEIGHT=512

```

### WFS (Web Feature Service)

WFS provides access to actual geographic feature data. Be cautious when requesting large areas or datasets.

```
{{host}}/wfs?
  service=WFS&
  version=2.0.0&
  request=GetFeature&
  typeName={{layer}}&
  bbox={{bbox}},EPSG:4326&
  outputFormat=application/json&
  &count=1
  &startIndex=0
```

**Best Practices for WFS:**

1. Use paging to limit the number of features returned:
    ```
    &count=10&startIndex=0
    ```
2. Apply a filter to reduce the dataset:
    ```
    &CQL_FILTER=attribute_name='value'
    ```
3. Use `propertyName` to limit returned attributes:
    ```
    &propertyName=attribute1,attribute2
    ```

### TMS (Tile Map Service)

TMS provides access to cartographic maps divided into tiles.

```
{{host}}/gwc/service/tms/1.0.0/{{layer}}@EPSG:4326@png/{z}/{x}/{y}.png
```

### WMTS (Web Map Tile Service)

WMTS also provides access to tiled maps.

```
{{host}}/gwc/service/wmts?
  layer={{layer}}&
  style=&
  tilematrixset=EPSG:4326&
  Service=WMTS&
  Request=GetTile&
  Version=1.0.0&
  Format=image/png&
  TileMatrix={z}&
  TileCol={x}&
  TileRow={y}
```

## Important Considerations

1. **Data Volume**: For WFS and WCS, requesting full extents or large areas can result in extremely large file sizes. Always try to limit your requests to the necessary extent and attributes.

2. **Server Load**: Large requests can put significant strain on the server. Be mindful of server resources, especially in high-traffic applications.

3. **Network Performance**: Large data transfers can slow down your application. Consider implementing progressive loading or tiling strategies where appropriate.

4. **Client-side Processing**: For WFS, if you need to work with a large dataset, consider implementing client-side spatial indexing and filtering to manage the data more efficiently after it's loaded.

5. **Caching**: Implement caching strategies to store and reuse data when possible, reducing the number of requests to the server.

By following these best practices and considerations, you can more effectively work with WFS and WCS services, balancing between data needs and performance constraints.
