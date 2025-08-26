# OGC Services Documentation

This guide explains how to access various OGC (Open Geospatial Consortium) services for layer: `{{layerName}}`

## Services

### WMS (Web Map Service)

WMS provides map <a href="{{wmsUrl}}" target="_blank">images</a>

```
{{wmsUrlFormat}}
```

**Preview:**
<div style="display:flex;justify-content:center; padding:10px">
<img src="{{wmsUrl}}"
  alt="WMS Preview of {{layerName}}"
  style="max-width: 50%; border: 1px solid var(--mx_ui_border); border-radius: 5px;"
  loading="lazy" />
</div>

### WFS (Web Feature Service)

WFS provides access to actual geographic feature data. <a href="{{wfsUrl}}" target="_blank">Try this example</a>

```
{{wfsUrlFormat}}
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
4. **Always use a small bounding box** to prevent large data transfers that could impact server performance.

### TMS (Tile Map Service)

TMS provides access to cartographic maps divided into tiles.

```
{{tmsUrlFormat}}
```

### WMTS (Web Map Tile Service)

WMTS also provides access to tiled maps.

```
{{wmtsUrlFormat}}
```

## Important Considerations

1. **Data Volume**: For WFS and WCS, requesting full extents or large areas can result in extremely large file sizes. Always try to limit your requests to the necessary extent and attributes.

2. **Server Load**: Large requests can put significant strain on the server. Be mindful of server resources, especially in high-traffic applications.

3. **Network Performance**: Large data transfers can slow down your application. Consider implementing progressive loading or tiling strategies where appropriate.

4. **Client-side Processing**: For WFS, if you need to work with a large dataset, consider implementing client-side spatial indexing and filtering to manage the data more efficiently after it's loaded.

5. **Caching**: Implement caching strategies to store and reuse data when possible, reducing the number of requests to the server.

By following these best practices and considerations, you can more effectively work with WFS and WCS services, balancing between data needs and performance constraints.
