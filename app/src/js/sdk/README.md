
# MapX SDK

The package `MxSdk` ease the integration of MapX. It features a simple way to interact with MapX within a static web page or from a full featured application.

## Usage

As an integrator you will use the `Manager` class to embed an instance of MapX and allow to interact with MapX's specific methods or events.

### Module include

```
$ npm install @fxi/mxsdk
...
import {Manager} from '@fxi/mxsdk';
```

### HTML inline 

```html
<script src="https://app.mapx.org/sdk/mxsdk.umd.js"></script>
```

```js
const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: {
    host: 'app.mapx.org'
  },
  static: true,
  verbose: true,
  params: {
    closePanels: true,
    views: ['MX-Z741Z-HA4JJ-OGV29'],
    language: 'fr'
  }
});
```

### Search parameters 

Mapx has a set of valid search parameters in its query string. The SDK will use the `params` object to build the querry string.

Current supported parameters are [defined in the wiki](https://github.com/unep-grid/mapx/wiki/URL-parameters).


## Methods and events

The `ready` event is the entry point on which methods are to be used; example:

```js
/**
 * Embed a MapX instance
 */
const mapx = new Manager({
  container: document.getElementById('mapx'),
  url: 'https://app.mapx.org/?project=MX-YBJ-YYF-08R-UUR-QW6&language=en',
});

/**
 * Use methods upon the ready event
 */
mapx.on('ready', async () => {

  /**
   * Get list of views
   */
  const views = await mapx.ask('get_views')
  console.log(views);

  /**
   * Add a view to be displayed on the embedded map
   */
  await mapx.ask('view_add', {idView: 'MX-ML9PZ-PZ1SI-WVV85'});

  // Etc, ...

});
```

### Methods

Methods are handled by the [MapxResolvers class](#MapxResolversApp) and are call using `mapx.ask(<method name>[, <object param(s)>])` which returns a Promise or a Promisified value. E.g. `mapx.ask('get_user_ip').then(console.log)`. In app mode, all methods from [MapxResolvers app](#MapxResolversApp) and [MapxResolvers static](#MapxResolversStatic) are avaible. In static mode, only the subset from [MapxResolvers static](#MapxResolversStatic) can be used.

### Events

Events are hookable using `Manager.on(<event name>, <callback>)`. Here are the available events.

SDK events:
- message
- ready

MapX events:
- language_change
- project_change
- session_start
- session_end
- mapx_connected
- mapx_disconnected
- mapx_ready
- click_attributes
- views_list_updated
- view_created
- layers_ordered
- view_deleted
- view_remove
- view_removed
- view_filter
- view_filtered
- view_add
- view_added
- spotlight_progress
- spotlight_update
- settings_change
- settings_user_change
- story_step
- view_panel_click

### Resources

Further usage resources:
- [Observable collection](https://observablehq.com/collection/@trepmag/mapx-sdk) to have an interactive showcase
- [Examples](examples/) within this repository
- [Starter project example](https://git.unepgrid.ch/drikc/mapx-sdk-starter-project)
- [Prototype presentation (1-Jul-2020)](https://unepgrid.ch/storage/app/media/platforms/mapx-sdk-prototype-presentation-20200701.html)
- [Package at npm registry](https://www.npmjs.com/package/@fxi/mxsdk)
- [Wiki example](https://github.com/unep-grid/mapx/wiki/SDK-usage-examples)

## Documentation

### Classes

<dl>
<dt><a href="#MapxResolversApp">MapxResolversApp</a> ⇐ <code><a href="#MapxResolversStatic">MapxResolversStatic</a></code></dt>
<dd><p>MapX resolvers available in app only</p>
</dd>
<dt><a href="#MapxResolversPanels">MapxResolversPanels</a> ⇐ <code>ResolversBase</code></dt>
<dd><p>MapX resolvers for interacting with panels</p>
</dd>
<dt><a href="#MapxResolversStatic">MapxResolversStatic</a> ⇐ <code><a href="#MapxResolversPanels">MapxResolversPanels</a></code></dt>
<dd><p>MapX resolvers available in static and app</p>
</dd>
</dl>

<a name="MapxResolversApp"></a>

### MapxResolversApp ⇐ [<code>MapxResolversStatic</code>](#MapxResolversStatic)
MapX resolvers available in app only

**Kind**: global class  
**Extends**: [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

* [MapxResolversApp](#MapxResolversApp) ⇐ [<code>MapxResolversStatic</code>](#MapxResolversStatic)
    * [.get_sdk_methods()](#MapxResolversApp+get_sdk_methods) ⇒ <code>Array</code>
    * [.show_modal_login()](#MapxResolversApp+show_modal_login) ⇒ <code>Boolean</code>
    * [.show_modal_view_meta()](#MapxResolversApp+show_modal_view_meta) ⇒ <code>Boolean</code>
    * [.launch_chaos_test()](#MapxResolversApp+launch_chaos_test) ⇒ <code>Boolean</code>
    * [.show_modal_view_edit()](#MapxResolversApp+show_modal_view_edit) ⇒ <code>Boolean</code>
    * [.show_modal_tool(opt)](#MapxResolversApp+show_modal_tool) ⇒ <code>Boolean</code> \| <code>Array</code>
    * [.get_user_id()](#MapxResolversApp+get_user_id) ⇒ <code>Number</code>
    * [.set_token(Mapx)](#MapxResolversApp+set_token)
    * [.get_token()](#MapxResolversApp+get_token) ⇒ <code>String</code>
    * [.get_user_roles()](#MapxResolversApp+get_user_roles) ⇒ <code>Object</code>
    * [.check_user_role(opt)](#MapxResolversApp+check_user_role) ⇒ <code>Boolean</code>
    * [.check_user_role_breaker(roleReq, opt)](#MapxResolversApp+check_user_role_breaker) ⇒ <code>Boolean</code>
    * [.get_user_email()](#MapxResolversApp+get_user_email) ⇒ <code>String</code>
    * [.set_project(opt)](#MapxResolversApp+set_project) ⇒ <code>Boolean</code>
    * [.get_projects(opt)](#MapxResolversApp+get_projects) ⇒ <code>Array</code>
    * [.get_project()](#MapxResolversApp+get_project) ⇒ <code>String</code>
    * [.get_project_collections(opt)](#MapxResolversApp+get_project_collections) ⇒ <code>Array</code>
    * [.is_user_guest()](#MapxResolversApp+is_user_guest) ⇒ <code>Boolean</code>
    * [.get_views_list_state()](#MapxResolversApp+get_views_list_state) ⇒ <code>Array</code>
    * [.get_views_id_open()](#MapxResolversApp+get_views_id_open) ⇒ <code>Array</code>
    * [.set_views_list_filters(opt)](#MapxResolversApp+set_views_list_filters) ⇒ <code>Boolean</code>
    * [.get_views_list_filters()](#MapxResolversApp+get_views_list_filters) ⇒ <code>Array</code>
    * [.get_views_list_order()](#MapxResolversApp+get_views_list_order) ⇒ <code>Array</code>
    * [.set_views_list_state(opt)](#MapxResolversApp+set_views_list_state) ⇒ <code>Boolean</code>
    * [.set_views_list_sort(opt)](#MapxResolversApp+set_views_list_sort) ⇒ <code>Boolean</code>
    * [.is_views_list_sorted(opt)](#MapxResolversApp+is_views_list_sorted) ⇒ <code>Boolean</code>
    * [.move_view_top(opt)](#MapxResolversApp+move_view_top) ⇒ <code>Boolean</code>
    * [.move_view_bottom(opt)](#MapxResolversApp+move_view_bottom) ⇒ <code>Boolean</code>
    * [.move_view_after(opt)](#MapxResolversApp+move_view_after) ⇒ <code>Boolean</code>
    * [.move_view_before(opt)](#MapxResolversApp+move_view_before) ⇒ <code>Boolean</code>
    * [.move_view_up(opt)](#MapxResolversApp+move_view_up) ⇒ <code>Boolean</code>
    * [.move_view_down(opt)](#MapxResolversApp+move_view_down) ⇒ <code>Boolean</code>
    * [.table_editor_open(opt)](#MapxResolversApp+table_editor_open) ⇒ <code>Object</code>
    * [.table_editor_close()](#MapxResolversApp+table_editor_close)
    * [.table_editor_exec(opt)](#MapxResolversApp+table_editor_exec) ⇒ <code>Any</code>
    * [.get_sources_list_edit()](#MapxResolversApp+get_sources_list_edit) ⇒ <code>Array</code>
    * [.set_panel_left_visibility(opt)](#MapxResolversStatic+set_panel_left_visibility) ⇒ <code>Boolean</code>
    * [.has_dashboard()](#MapxResolversStatic+has_dashboard) ⇒ <code>Boolean</code>
    * [.tests_ws()](#MapxResolversStatic+tests_ws)
    * [.set_immersive_mode()](#MapxResolversStatic+set_immersive_mode) ⇒ <code>Boolean</code>
    * [.get_immersive_mode()](#MapxResolversStatic+get_immersive_mode) ⇒ <code>Boolean</code>
    * [.set_3d_terrain(opt)](#MapxResolversStatic+set_3d_terrain)
    * [.set_mode_3d(opt)](#MapxResolversStatic+set_mode_3d)
    * [.set_mode_aerial(opt)](#MapxResolversStatic+set_mode_aerial)
    * [.show_modal_share(opt)](#MapxResolversStatic+show_modal_share) ⇒ <code>Boolean</code>
    * [.close_modal_share()](#MapxResolversStatic+close_modal_share) ⇒ <code>Boolean</code>
    * [.get_modal_share_string()](#MapxResolversStatic+get_modal_share_string) ⇒ <code>String</code>
    * [.get_modal_share_tests()](#MapxResolversStatic+get_modal_share_tests) ⇒ <code>array</code>
    * [.set_theme(opt)](#MapxResolversStatic+set_theme) ⇒ <code>Boolean</code>
    * [.get_themes_id()](#MapxResolversStatic+get_themes_id) ⇒ <code>Array</code>
    * [.get_themes()](#MapxResolversStatic+get_themes) ⇒ <code>Object</code>
    * [.get_theme_id()](#MapxResolversStatic+get_theme_id) ⇒ <code>string</code>
    * [.get_themes_ids()](#MapxResolversStatic+get_themes_ids) ⇒ <code>Array.&lt;string&gt;</code>
    * [.add_theme(opt)](#MapxResolversStatic+add_theme) ⇒ <code>Boolean</code>
    * [.has_el_id(opt)](#MapxResolversStatic+has_el_id)
    * [.set_dashboard_visibility(opt)](#MapxResolversStatic+set_dashboard_visibility) ⇒ <code>Boolean</code>
    * [.is_dashboard_visible()](#MapxResolversStatic+is_dashboard_visible) ⇒ <code>Boolean</code>
    * [.get_source_meta(opt)](#MapxResolversStatic+get_source_meta) ⇒ <code>Object</code>
    * [.get_view_source_summary(opt)](#MapxResolversStatic+get_view_source_summary) ⇒ <code>Object</code>
    * [.get_user_ip()](#MapxResolversStatic+get_user_ip) ⇒ <code>Object</code>
    * [.get_language()](#MapxResolversStatic+get_language) ⇒ <code>String</code>
    * [.set_language(opt)](#MapxResolversStatic+set_language) ⇒ <code>Boolean</code>
    * [.get_languages()](#MapxResolversStatic+get_languages) ⇒ <code>Array</code>
    * [.get_views()](#MapxResolversStatic+get_views) ⇒ <code>Array</code>
    * [.get_views_id()](#MapxResolversStatic+get_views_id) ⇒ <code>Array</code>
    * [.get_view_meta_vt_attribute(opt)](#MapxResolversStatic+get_view_meta_vt_attribute) ⇒ <code>Object</code>
    * [.get_view_meta(opt, view)](#MapxResolversStatic+get_view_meta) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.get_view_table_attribute_config(opt)](#MapxResolversStatic+get_view_table_attribute_config) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.get_view_table_attribute_url(opt)](#MapxResolversStatic+get_view_table_attribute_url) ⇒ <code>Promise.&lt;String&gt;</code>
    * [.get_view_table_attribute(opt)](#MapxResolversStatic+get_view_table_attribute) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.get_view_legend_image(opt)](#MapxResolversStatic+get_view_legend_image) ⇒ <code>String</code>
    * [.set_view_legend_state(opt)](#MapxResolversStatic+set_view_legend_state) ⇒ <code>void</code> \| <code>Error</code>
    * [.get_view_legend_state(opt)](#MapxResolversStatic+get_view_legend_state) ⇒ <code>Array</code> \| <code>Error</code>
    * [.get_view_legend_values(opt)](#MapxResolversStatic+get_view_legend_values) ⇒ <code>Array</code>
    * [.set_views_layer_order(opt)](#MapxResolversStatic+set_views_layer_order) ⇒ <code>Boolean</code>
    * [.get_views_layer_order()](#MapxResolversStatic+get_views_layer_order) ⇒ <code>Array</code>
    * [.get_views_with_visible_layer()](#MapxResolversStatic+get_views_with_visible_layer) ⇒ <code>Array</code>
    * [.set_view_layer_filter_text(opt)](#MapxResolversStatic+set_view_layer_filter_text) ⇒ <code>void</code>
    * [.get_view_layer_filter_text(opt)](#MapxResolversStatic+get_view_layer_filter_text) ⇒ <code>array</code>
    * [.set_view_layer_filter_numeric(opt)](#MapxResolversStatic+set_view_layer_filter_numeric) ⇒ <code>void</code>
    * [.get_view_layer_filter_numeric(opt)](#MapxResolversStatic+get_view_layer_filter_numeric) ⇒ <code>Number</code> \| <code>Array</code>
    * [.set_view_layer_filter_time(opt)](#MapxResolversStatic+set_view_layer_filter_time) ⇒ <code>void</code>
    * [.get_view_layer_filter_time(opt)](#MapxResolversStatic+get_view_layer_filter_time) ⇒ <code>Number</code> \| <code>Array</code>
    * [.set_view_layer_transparency(opt)](#MapxResolversStatic+set_view_layer_transparency) ⇒ <code>void</code>
    * [.get_view_layer_transparency(opt)](#MapxResolversStatic+get_view_layer_transparency) ⇒ <code>Number</code>
    * [.view_add(opt)](#MapxResolversStatic+view_add) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.view_remove(opt)](#MapxResolversStatic+view_remove) ⇒ <code>Boolean</code>
    * [.download_view_source_external(opt)](#MapxResolversStatic+download_view_source_external) ⇒ <code>Object</code>
    * [.download_view_source_raster()](#MapxResolversStatic+download_view_source_raster)
    * [.download_view_source_vector(opt)](#MapxResolversStatic+download_view_source_vector) ⇒ <code>Object</code>
    * [.close_modal_download_vector()](#MapxResolversStatic+close_modal_download_vector) ⇒ <code>Boolean</code>
    * [.download_view_source_geojson(opt)](#MapxResolversStatic+download_view_source_geojson) ⇒ <code>Object</code>
    * [.show_modal_map_composer()](#MapxResolversStatic+show_modal_map_composer) ⇒ <code>Boolean</code>
    * [.close_modal_all()](#MapxResolversStatic+close_modal_all) ⇒ <code>Boolean</code>
    * [.get_views_title(opt)](#MapxResolversStatic+get_views_title) ⇒ <code>Array</code>
    * [.set_vector_spotlight(opt)](#MapxResolversStatic+set_vector_spotlight) ⇒ <code>Object</code>
    * [.set_highlighter(opt)](#MapxResolversStatic+set_highlighter) ⇒ <code>number</code>
    * [.update_highlighter()](#MapxResolversStatic+update_highlighter) ⇒ <code>number</code>
    * [.reset_highlighter()](#MapxResolversStatic+reset_highlighter) ⇒ <code>number</code>
    * [.view_geojson_create(opt)](#MapxResolversStatic+view_geojson_create) ⇒ <code>Object</code>
    * [.view_geojson_set_style(opt)](#MapxResolversStatic+view_geojson_set_style) ⇒ <code>Boolean</code>
    * [.view_geojson_delete(opt)](#MapxResolversStatic+view_geojson_delete) ⇒ <code>Boolean</code>
    * [.set_features_click_sdk_only(opt)](#MapxResolversStatic+set_features_click_sdk_only) ⇒ <code>Array</code>
    * [.get_features_click_handlers()](#MapxResolversStatic+get_features_click_handlers) ⇒ <code>Array</code>
    * [.map_fly_to(opt)](#MapxResolversStatic+map_fly_to) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.map_jump_to(opt)](#MapxResolversStatic+map_jump_to) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.map_get_zoom()](#MapxResolversStatic+map_get_zoom) ⇒ <code>Float</code>
    * [.map_get_center()](#MapxResolversStatic+map_get_center) ⇒ <code>Object</code>
    * [.map_get_bounds_array()](#MapxResolversStatic+map_get_bounds_array) ⇒ <code>Array</code>
    * [.map_set_bounds_array(opt)](#MapxResolversStatic+map_set_bounds_array)
    * [.map_get_max_bounds_array()](#MapxResolversStatic+map_get_max_bounds_array) ⇒ <code>Array</code> \| <code>null</code>
    * [.map_set_max_bounds_array(opt)](#MapxResolversStatic+map_set_max_bounds_array) ⇒ <code>boolean</code>
    * [.map(opt)](#MapxResolversStatic+map) ⇒ <code>Promise.&lt;(Any\|Boolean)&gt;</code>
    * [.map_wait_idle()](#MapxResolversStatic+map_wait_idle) ⇒ <code>Boolean</code>
    * [.common_loc_get_list_codes()](#MapxResolversStatic+common_loc_get_list_codes) ⇒ <code>Array</code>
    * [.common_loc_get_table_codes(opt)](#MapxResolversStatic+common_loc_get_table_codes) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.common_loc_get_bbox(o)](#MapxResolversStatic+common_loc_get_bbox) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.common_loc_fit_bbox(o)](#MapxResolversStatic+common_loc_fit_bbox) ⇒ <code>Promise.&lt;Array&gt;</code>

<a name="MapxResolversApp+get_sdk_methods"></a>

#### mapxResolversApp.get\_sdk\_methods() ⇒ <code>Array</code>
List resolvers methods

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Overrides**: [<code>get\_sdk\_methods</code>](#MapxResolversStatic+get_sdk_methods)  
**Returns**: <code>Array</code> - array of supported methods  
<a name="MapxResolversApp+show_modal_login"></a>

#### mapxResolversApp.show\_modal\_login() ⇒ <code>Boolean</code>
Show the login modal window

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversApp+show_modal_view_meta"></a>

#### mapxResolversApp.show\_modal\_view\_meta() ⇒ <code>Boolean</code>
Show view meta modal window

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversApp+launch_chaos_test"></a>

#### mapxResolversApp.launch\_chaos\_test() ⇒ <code>Boolean</code>
Launch chaos test : open / close views by batch for a minute

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - pass  
<a name="MapxResolversApp+show_modal_view_edit"></a>

#### mapxResolversApp.show\_modal\_view\_edit() ⇒ <code>Boolean</code>
Show view edit modal window

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversApp+show_modal_tool"></a>

#### mapxResolversApp.show\_modal\_tool(opt) ⇒ <code>Boolean</code> \| <code>Array</code>
Show modal for tools

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> \| <code>Array</code> - Done or the list of tools  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.tool | <code>String</code> | Id of the tools |
| opt.list | <code>Boolean</code> | Return a list of tools |

<a name="MapxResolversApp+get_user_id"></a>

#### mapxResolversApp.get\_user\_id() ⇒ <code>Number</code>
Get user id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Number</code> - Current user id  
<a name="MapxResolversApp+set_token"></a>

#### mapxResolversApp.set\_token(Mapx)
Manually set MapX app token and reload the app.
This encrypted token is used to fingerprint
user, browser and time since the last log in. It could be generated using
MapX cryptography private key, or if not available, retrived from a live
session with mx.helpers.getToken() or with the SDK, get_mapx_token.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| Mapx | <code>String</code> | valid encrypted token |

<a name="MapxResolversApp+get_token"></a>

#### mapxResolversApp.get\_token() ⇒ <code>String</code>
Retrieve MapX token.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - MapX token.  
<a name="MapxResolversApp+get_user_roles"></a>

#### mapxResolversApp.get\_user\_roles() ⇒ <code>Object</code>
Get user roles

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - Current user roles  
<a name="MapxResolversApp+check_user_role"></a>

#### mapxResolversApp.check\_user\_role(opt) ⇒ <code>Boolean</code>
Check if user as given role

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - has role(s)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.role | <code>String</code> \| <code>Array</code> | Role(s) to check |
| opt.all | <code>Boolean</code> | all roles must match, else at least one |

<a name="MapxResolversApp+check_user_role_breaker"></a>

#### mapxResolversApp.check\_user\_role\_breaker(roleReq, opt) ⇒ <code>Boolean</code>
Check for any matching roles, send an error if it does not match

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - matched  

| Param | Type | Description |
| --- | --- | --- |
| roleReq | <code>Array</code> | Array of required role. eg. ['members','admins'] |
| opt | <code>Object</code> | Options |
| opt.reportError | <code>Boolean</code> | Report an error if no match (default true) |
| opt.id | <code>Any</code> | An identifier |

<a name="MapxResolversApp+get_user_email"></a>

#### mapxResolversApp.get\_user\_email() ⇒ <code>String</code>
Get user email

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - Current user email ( if logged, null if not)  
<a name="MapxResolversApp+set_project"></a>

#### mapxResolversApp.set\_project(opt) ⇒ <code>Boolean</code>
Set project

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idProject | <code>String</code> | Id of the project to switch to |

<a name="MapxResolversApp+get_projects"></a>

#### mapxResolversApp.get\_projects(opt) ⇒ <code>Array</code>
Get projects list

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - list of project for the current user, using optional filters  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Project fetching option |

<a name="MapxResolversApp+get_project"></a>

#### mapxResolversApp.get\_project() ⇒ <code>String</code>
Get current project id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - Current project id  
<a name="MapxResolversApp+get_project_collections"></a>

#### mapxResolversApp.get\_project\_collections(opt) ⇒ <code>Array</code>
Get list of collection for the current project

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of collections names  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.open | <code>Boolean</code> | Return only collections from open views |

<a name="MapxResolversApp+is_user_guest"></a>

#### mapxResolversApp.is\_user\_guest() ⇒ <code>Boolean</code>
Test if the current user is guest

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - User is guest  
<a name="MapxResolversApp+get_views_list_state"></a>

#### mapxResolversApp.get\_views\_list\_state() ⇒ <code>Array</code>
Get views list state

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
<a name="MapxResolversApp+get_views_id_open"></a>

#### mapxResolversApp.get\_views\_id\_open() ⇒ <code>Array</code>
Get list of view in "open" state
-> from the views list : possibly without layer

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolversApp+set_views_list_filters"></a>

#### mapxResolversApp.set\_views\_list\_filters(opt) ⇒ <code>Boolean</code>
Set views list filter (ui)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.reset | <code>Boolean</code> | Reset and remove all rules |
| opt.rules | <code>Array</code> | Array of filter object. e.g. {type:'text',value:'marine'} |
| opt.mode | <code>Boolean</code> | Set mode : 'intersection' or 'union'; |

**Example**  
```js
// reset all rules
mapx.ask('set_views_list_filter',{
   reset:true
})

// Reset rules and filter views with a dashboard
mapx.ask('set_views_list_filter',{
   reset: true,
   rules : [{
   type : 'view_components,
   value:'dashboard'
   }]
})

// All views with marine or earth in title or abstract or vector views or raster views
mapx.ask('set_views_list_filter',{
   rules:
    [
     {
          type: 'text',
          value: 'marine or earth'
      },
      {
          type: 'view_components',
          value: ['vt','rt']
      }
    ],
    mode: 'union'
  })
```
<a name="MapxResolversApp+get_views_list_filters"></a>

#### mapxResolversApp.get\_views\_list\_filters() ⇒ <code>Array</code>
Get views list filter rules

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Rule list  
<a name="MapxResolversApp+get_views_list_order"></a>

#### mapxResolversApp.get\_views\_list\_order() ⇒ <code>Array</code>
Get views current absolute order (without groups) in the list

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
<a name="MapxResolversApp+set_views_list_state"></a>

#### mapxResolversApp.set\_views\_list\_state(opt) ⇒ <code>Boolean</code>
Set state / views list order, groups, etc. Opened view will be closed

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.state | <code>Array</code> | Mapx views list state |

<a name="MapxResolversApp+set_views_list_sort"></a>

#### mapxResolversApp.set\_views\_list\_sort(opt) ⇒ <code>Boolean</code>
Set views list order

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.asc | <code>Boolean</code> | Asc |
| opt.mode | <code>String</code> | Mode : 'string' or 'date'; |

<a name="MapxResolversApp+is_views_list_sorted"></a>

#### mapxResolversApp.is\_views\_list\_sorted(opt) ⇒ <code>Boolean</code>
Test if views list is sorted

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Sorted  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.asc | <code>Boolean</code> | Asc |
| opt.mode | <code>String</code> | Mode : 'string' or 'date'; |

<a name="MapxResolversApp+move_view_top"></a>

#### mapxResolversApp.move\_view\_top(opt) ⇒ <code>Boolean</code>
Move view on top of its group

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolversApp+move_view_bottom"></a>

#### mapxResolversApp.move\_view\_bottom(opt) ⇒ <code>Boolean</code>
Move view on the bottom of its group

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolversApp+move_view_after"></a>

#### mapxResolversApp.move\_view\_after(opt) ⇒ <code>Boolean</code>
Move view after anoter view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |
| opt.idViewAfter | <code>Sring</code> |  |

<a name="MapxResolversApp+move_view_before"></a>

#### mapxResolversApp.move\_view\_before(opt) ⇒ <code>Boolean</code>
Move view before another view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |
| opt.idViewBefore | <code>Sring</code> |  |

<a name="MapxResolversApp+move_view_up"></a>

#### mapxResolversApp.move\_view\_up(opt) ⇒ <code>Boolean</code>
Move view up

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolversApp+move_view_down"></a>

#### mapxResolversApp.move\_view\_down(opt) ⇒ <code>Boolean</code>
Move view down

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolversApp+table_editor_open"></a>

#### mapxResolversApp.table\_editor\_open(opt) ⇒ <code>Object</code>
Show table editor ( require log in

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - instance state  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idTable | <code>String</code> | Id of the table to edit |

<a name="MapxResolversApp+table_editor_close"></a>

#### mapxResolversApp.table\_editor\_close()
Close table editor

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
<a name="MapxResolversApp+table_editor_exec"></a>

#### mapxResolversApp.table\_editor\_exec(opt) ⇒ <code>Any</code>
Apply any command on Table Editor
Initially for testing purposes. May cause data loss.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Any</code> - res Result. If null, instance state  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idTable | <code>String</code> | Id of the table to edit |
| opt.method | <code>String</code> | Method name |
| opt.value | <code>Object</code> | Method arguments |

<a name="MapxResolversApp+get_sources_list_edit"></a>

#### mapxResolversApp.get\_sources\_list\_edit() ⇒ <code>Array</code>
Get editable source list by current user

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Rows  
<a name="MapxResolversStatic+set_panel_left_visibility"></a>

#### mapxResolversApp.set\_panel\_left\_visibility(opt) ⇒ <code>Boolean</code>
Set panel visibility

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.show | <code>Boolean</code> | Show the panel. If false, hide. |
| opt.open | <code>Boolean</code> | Open the panel. If false, close. |
| opt.toggle | <code>Boolean</code> | If closed, open. If open, close. |

<a name="MapxResolversStatic+has_dashboard"></a>

#### mapxResolversApp.has\_dashboard() ⇒ <code>Boolean</code>
Test if dashboard exists

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - exists  
<a name="MapxResolversStatic+tests_ws"></a>

#### mapxResolversApp.tests\_ws()
End to end ws com testing

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
<a name="MapxResolversStatic+set_immersive_mode"></a>

#### mapxResolversApp.set\_immersive\_mode() ⇒ <code>Boolean</code>
Toogle immersive mode: hide or show ALL panels.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - enabled  
**Aram**: <code>Object</code> opt Options  

| Param | Type | Description |
| --- | --- | --- |
| opt.enable | <code>Boolean</code> | Force enable |
| opt.toggle | <code>Boolean</code> | Toggle |

<a name="MapxResolversStatic+get_immersive_mode"></a>

#### mapxResolversApp.get\_immersive\_mode() ⇒ <code>Boolean</code>
Get immersive mode state

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Enabled  
<a name="MapxResolversStatic+set_3d_terrain"></a>

#### mapxResolversApp.set\_3d\_terrain(opt)
Enable or disable 3d terrain

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'enable','disable','toggle' |

<a name="MapxResolversStatic+set_mode_3d"></a>

#### mapxResolversApp.set\_mode\_3d(opt)
Enable or disable 3d terrain
Set related layers visibility, change control buttons state

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'show','hide','toggle' |

<a name="MapxResolversStatic+set_mode_aerial"></a>

#### mapxResolversApp.set\_mode\_aerial(opt)
Enable or disable aerial/satelite mode
Set related layers visibility, change control buttons state

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'show','hide','toggle' |

<a name="MapxResolversStatic+show_modal_share"></a>

#### mapxResolversApp.show\_modal\_share(opt) ⇒ <code>Boolean</code>
Show sharing modal

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> \| <code>Array</code> | Id view to share |

<a name="MapxResolversStatic+close_modal_share"></a>

#### mapxResolversApp.close\_modal\_share() ⇒ <code>Boolean</code>
Close sharing modal

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  
<a name="MapxResolversStatic+get_modal_share_string"></a>

#### mapxResolversApp.get\_modal\_share\_string() ⇒ <code>String</code>
Get sharing string

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - Sharing string ( code / url )  
<a name="MapxResolversStatic+get_modal_share_tests"></a>

#### mapxResolversApp.get\_modal\_share\_tests() ⇒ <code>array</code>
Modal Share Tests Suite

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>array</code> - array of tests  
<a name="MapxResolversStatic+set_theme"></a>

#### mapxResolversApp.set\_theme(opt) ⇒ <code>Boolean</code>
Set MapX theme by id or set custom colors.
Both ways are exclusive.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idTheme | <code>String</code> | Valid theme id. Use 'get_themes_id' to get a list |
| opt.colors | <code>Object</code> | Valid colors scheme. Use 'get_themes' to see default themes structure. |

<a name="MapxResolversStatic+get_themes_id"></a>

#### mapxResolversApp.get\_themes\_id() ⇒ <code>Array</code>
Get themes id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - array of themes id  
<a name="MapxResolversStatic+get_themes"></a>

#### mapxResolversApp.get\_themes() ⇒ <code>Object</code>
Get all themes

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - Themes object with themes id as key  
<a name="MapxResolversStatic+get_theme_id"></a>

#### mapxResolversApp.get\_theme\_id() ⇒ <code>string</code>
Get current theme id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>string</code> - Theme id  
<a name="MapxResolversStatic+get_themes_ids"></a>

#### mapxResolversApp.get\_themes\_ids() ⇒ <code>Array.&lt;string&gt;</code>
Get all theme id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array.&lt;string&gt;</code> - Theme ids  
<a name="MapxResolversStatic+add_theme"></a>

#### mapxResolversApp.add\_theme(opt) ⇒ <code>Boolean</code>
Add a custom theme into mapx and use it.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.theme | <code>String</code> | Valid theme (full). |

<a name="MapxResolversStatic+has_el_id"></a>

#### mapxResolversApp.has\_el\_id(opt)
Check if element is visible, by id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.id | <code>String</code> | Id of the element to check |
| opt.timeout | <code>Number</code> | Timeout |

<a name="MapxResolversStatic+set_dashboard_visibility"></a>

#### mapxResolversApp.set\_dashboard\_visibility(opt) ⇒ <code>Boolean</code>
Set dashboard visibility

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.show | <code>Boolean</code> | If true, show the dashboard |
| opt.toggle | <code>Boolean</code> | Toggle the dashoard |

<a name="MapxResolversStatic+is_dashboard_visible"></a>

#### mapxResolversApp.is\_dashboard\_visible() ⇒ <code>Boolean</code>
Check if the dashboard is visible

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - The dashboard is visible  
<a name="MapxResolversStatic+get_source_meta"></a>

#### mapxResolversApp.get\_source\_meta(opt) ⇒ <code>Object</code>
Get source metadata

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - Source MapX metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idSource | <code>String</code> | Id of the source |

<a name="MapxResolversStatic+get_view_source_summary"></a>

#### mapxResolversApp.get\_view\_source\_summary(opt) ⇒ <code>Object</code>
Get view's source summary

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - Source summary  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |
| opt.stats | <code>Array</code> | Stats to retrieve. ['base', 'attributes', 'temporal', 'spatial'] |
| opt.idAttr | <code>String</code> | Attribute for stat (default = attrbute of the style) |

<a name="MapxResolversStatic+get_user_ip"></a>

#### mapxResolversApp.get\_user\_ip() ⇒ <code>Object</code>
Get user ip info

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - Current user ip object (ip, country, region, etc)  
<a name="MapxResolversStatic+get_language"></a>

#### mapxResolversApp.get\_language() ⇒ <code>String</code>
Get current language

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - Two letters language code  
<a name="MapxResolversStatic+set_language"></a>

#### mapxResolversApp.set\_language(opt) ⇒ <code>Boolean</code>
Setlanguage

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Laguage change process finished  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.lang | <code>String</code> | Two letters language code |

<a name="MapxResolversStatic+get_languages"></a>

#### mapxResolversApp.get\_languages() ⇒ <code>Array</code>
Get list of supported current languages

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of two letters language code  
<a name="MapxResolversStatic+get_views"></a>

#### mapxResolversApp.get\_views() ⇒ <code>Array</code>
Get list of available views as static objects

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+get_views_id"></a>

#### mapxResolversApp.get\_views\_id() ⇒ <code>Array</code>
Get list of available views id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolversStatic+get_view_meta_vt_attribute"></a>

#### mapxResolversApp.get\_view\_meta\_vt\_attribute(opt) ⇒ <code>Object</code>
Get vector view (vt) metadata of the attribute

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - attribut metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_meta"></a>

#### mapxResolversApp.get\_view\_meta(opt, view) ⇒ <code>Promise.&lt;Object&gt;</code>
Get view metadata

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - view metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| view | <code>Object</code> | meta data object |

<a name="MapxResolversStatic+get_view_table_attribute_config"></a>

#### mapxResolversApp.get\_view\_table\_attribute\_config(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Get view table attribute config

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - view attribute config  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_table_attribute_url"></a>

#### mapxResolversApp.get\_view\_table\_attribute\_url(opt) ⇒ <code>Promise.&lt;String&gt;</code>
Get view table attribute url

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_table_attribute"></a>

#### mapxResolversApp.get\_view\_table\_attribute(opt) ⇒ <code>Array.&lt;Object&gt;</code>
Get view table attribute

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_legend_image"></a>

#### mapxResolversApp.get\_view\_legend\_image(opt) ⇒ <code>String</code>
Get view legend

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>String</code> - PNG in base64 format  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| opt.format | <code>String</code> |  |

<a name="MapxResolversStatic+set_view_legend_state"></a>

#### mapxResolversApp.set\_view\_legend\_state(opt) ⇒ <code>void</code> \| <code>Error</code>
Updates the state of a view's legend with the provided values.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>void</code> \| <code>Error</code> - Returns nothing if successful or an error if there's no LegendVt instance.  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view object containing the legend instance. |
| opt.values | <code>Array</code> | An array of values to set the legend's state. |

<a name="MapxResolversStatic+get_view_legend_state"></a>

#### mapxResolversApp.get\_view\_legend\_state(opt) ⇒ <code>Array</code> \| <code>Error</code>
Retrieves the current state (checked values) of a view's legend.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> \| <code>Error</code> - An array of the currently checked values in the legend, or an error if there's no LegendVt instance.  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view id containing the legend instance. |

<a name="MapxResolversStatic+get_view_legend_values"></a>

#### mapxResolversApp.get\_view\_legend\_values(opt) ⇒ <code>Array</code>
Retrieves the values from the legend.

For numeric rules, the method returns an array of range arrays ([from, to]),
otherwise, it just returns an array of values.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - An array of checked values. For numeric rules, each entry is an array of format [from, to].  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view id containing the legend instance. |

**Example**  
```js
// Non-numeric rules
get_view_legend_values({view:"123"}); // e.g. ["value1", "value2", ...]

// Numeric rules
get_view_legend_values({view:"123"}); // e.g. [[0, 10], [10, 20], ...]
```
<a name="MapxResolversStatic+set_views_layer_order"></a>

#### mapxResolversApp.set\_views\_layer\_order(opt) ⇒ <code>Boolean</code>
Set view layer z position

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.order | <code>Array.&lt;String&gt;</code> | View order |
| opt.orig | <code>String</code> | Optional label for origin / logs |

**Example**  
```js
const views = await mapx.ask("get_views_with_visible_layer");
const order = views.toReversed();
const result = await mapx.ask("set_views_layer_order",{order});
```
<a name="MapxResolversStatic+get_views_layer_order"></a>

#### mapxResolversApp.get\_views\_layer\_order() ⇒ <code>Array</code>
Get list views with visible layers

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+get_views_with_visible_layer"></a>

#### mapxResolversApp.get\_views\_with\_visible\_layer() ⇒ <code>Array</code>
Get list views with visible layers (alias)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+set_view_layer_filter_text"></a>

#### mapxResolversApp.set\_view\_layer\_filter\_text(opt) ⇒ <code>void</code>
Filter view layer by text (if attribute is text)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | View id |
| opt.values | <code>array</code> | Values to use as filter |
| opt.attribute | <code>string</code> | Attribute to use as filter (default from style) |

<a name="MapxResolversStatic+get_view_layer_filter_text"></a>

#### mapxResolversApp.get\_view\_layer\_filter\_text(opt) ⇒ <code>array</code>
Get current text filter values for a given view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt.idView | <code>String</code> | View id |
| opt | <code>Options</code> | Options |

<a name="MapxResolversStatic+set_view_layer_filter_numeric"></a>

#### mapxResolversApp.set\_view\_layer\_filter\_numeric(opt) ⇒ <code>void</code>
Filter view layer by numeric (if attribute is numeric)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.attribute | <code>String</code> | Attribute name (default from style) |
| opt.from | <code>Numeric</code> | Value |
| opt.to | <code>Numeric</code> | Value |
| opt.value | <code>array</code> | Values (Deprecated) |

<a name="MapxResolversStatic+get_view_layer_filter_numeric"></a>

#### mapxResolversApp.get\_view\_layer\_filter\_numeric(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current numeric slider value

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+set_view_layer_filter_time"></a>

#### mapxResolversApp.set\_view\_layer\_filter\_time(opt) ⇒ <code>void</code>
Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )

This function creates a time filter based on the provided options
and sets this filter to the specific view identified by its ID.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | The options for the time filter. |
| opt.hasT0 | <code>boolean</code> | Flag indicating if the 'mx_t0' timestamp exists. |
| opt.hasT1 | <code>boolean</code> | Flag indicating if the 'mx_t1' timestamp exists. |
| opt.from | <code>number</code> | The 'from' timestamp for the filter in milliseconds. |
| opt.to | <code>number</code> | The 'to' timestamp for the filter in milliseconds. |
| opt.idView | <code>string</code> | The ID of the view to which the filter is to be applied. |

**Example**  
```js
// Get summary ( any attribute: get_view_source_summary returns time extent
// by default )
const summary = await mapx.ask("get_view_source_summary", {
 idView,
 idAttr: idAttr,
 });
// set config + convert seconds -> milliseconds
const start = summary.extent_time.min * 1000;
const end = summary.extent_time.max * 1000;
const hasT0 = summary.attributes.includes("mx_t0");
const hasT1 = summary.attributes.includes("mx_t1");
await mapx.ask("set_view_layer_filter_time", {
 idView,
 from,
 to,
 hasT0,
 hasT1,
});
```
<a name="MapxResolversStatic+get_view_layer_filter_time"></a>

#### mapxResolversApp.get\_view\_layer\_filter\_time(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current time slider value

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+set_view_layer_transparency"></a>

#### mapxResolversApp.set\_view\_layer\_transparency(opt) ⇒ <code>void</code>
Set layer transarency (0 : visible, 100 : 100% transparent)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolversStatic+get_view_layer_transparency"></a>

#### mapxResolversApp.get\_view\_layer\_transparency(opt) ⇒ <code>Number</code>
Get current transparency value for layers of a view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Number</code> - value  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+view_add"></a>

#### mapxResolversApp.view\_add(opt) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Add a view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.zoomToView | <code>Boolean</code> | Fly to view extends |

<a name="MapxResolversStatic+view_remove"></a>

#### mapxResolversApp.view\_remove(opt) ⇒ <code>Boolean</code>
remove a view

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+download_view_source_external"></a>

#### mapxResolversApp.download\_view\_source\_external(opt) ⇒ <code>Object</code>
Get the download links of an external source set in metadata (custom code, raster, etc)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - input options, with new key : url. E.g. {idView:<abc>,url:<first url>,urlItems:[{<url>,<label>,<is_download_link>}]}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | view view id |

<a name="MapxResolversStatic+download_view_source_raster"></a>

#### mapxResolversApp.download\_view\_source\_raster()
Get the download link of the raster source (same as download_view_source_external)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
<a name="MapxResolversStatic+download_view_source_vector"></a>

#### mapxResolversApp.download\_view\_source\_vector(opt) ⇒ <code>Object</code>
Open the download modal for vector views

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Vector view id |

<a name="MapxResolversStatic+close_modal_download_vector"></a>

#### mapxResolversApp.close\_modal\_download\_vector() ⇒ <code>Boolean</code>
Close download vector modal

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Done  
<a name="MapxResolversStatic+download_view_source_geojson"></a>

#### mapxResolversApp.download\_view\_source\_geojson(opt) ⇒ <code>Object</code>
Get the data from geojson view or download geojsn as a file

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>, data:<data (if mode = data)>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | GeoJSON view id |
| opt.mode | <code>String</code> | "file" or "data" |

<a name="MapxResolversStatic+show_modal_map_composer"></a>

#### mapxResolversApp.show\_modal\_map\_composer() ⇒ <code>Boolean</code>
Show map composer

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversStatic+close_modal_all"></a>

#### mapxResolversApp.close\_modal\_all() ⇒ <code>Boolean</code>
close all modal windows

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversStatic+get_views_title"></a>

#### mapxResolversApp.get\_views\_title(opt) ⇒ <code>Array</code>
Get list of views title

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of titles (string)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.views | <code>Array</code> | List of views or views id |
| opt.lang | <code>String</code> | Language code |

<a name="MapxResolversStatic+set_vector_spotlight"></a>

#### mapxResolversApp.set\_vector\_spotlight(opt) ⇒ <code>Object</code>
Spotlight vector feature : Enable, disable, toggle

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - options realised {enable:<false/true>,calcArea:<true/false>,nLayers:<n>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable or disable. If not set, toggle spotlight |
| opt.nLayers | <code>Number</code> | Numbers of layer that are used in the overlap tool. If not set, the default is 1 : any visible feature is spotlighted. If 0 = only part where all displayed layers are overlapping are spotligthed |
| opt.calcArea | <code>Boolean</code> | Estimate area covered by visible feature and display result in MapX interface |

<a name="MapxResolversStatic+set_highlighter"></a>

#### mapxResolversApp.set\_highlighter(opt) ⇒ <code>number</code>
Set the highlighter with the provided options.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>number</code> - Feature count  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Configuration options for the highlighter. |
| config.point | <code>PointLike</code> \| <code>Array.&lt;PointLike&gt;</code> | Location to query |
| opt.filters | <code>Array.&lt;Object&gt;</code> | Array of filter objects to be applied. |
| opt.filters[].id | <code>String</code> | Identifier of the view to which the filter applies. |
| opt.filters[].filter | <code>Array</code> | MapboxGl filter expression |

**Example**  
```js
mapx.ask('set_highlighter',{
  all: true,
});

mapx.ask('set_highlighter',{
  filters: [
    { id: "MX-TC0O1-34A9Y-RYDJG", filter: ["<", ["get", "year"], 2000] },
  ],
});

mapx.ask('set_highlighter',{
  filters: [
    { id: "MX-TC0O1-34A9Y-RYDJG", filter: [">=", ["get", "fatalities"], 7000] },
  ],
});

mapx.ask('set_highlighter',{
  filters: [
    {
      id: "MX-TC0O1-34A9Y-RYDJG",
      filter: [
        "in",
        ["get", "country"],
        ["literal", ["Nigeria", "Gabon", "Angola"]],
      ],
    },
  ],
});
```
<a name="MapxResolversStatic+update_highlighter"></a>

#### mapxResolversApp.update\_highlighter() ⇒ <code>number</code>
Update highlighter using previous configuration i.e refresh features

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>number</code> - Feature count  
<a name="MapxResolversStatic+reset_highlighter"></a>

#### mapxResolversApp.reset\_highlighter() ⇒ <code>number</code>
Clear all highlighted features and reset config

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>number</code> - Feature count  
<a name="MapxResolversStatic+view_geojson_create"></a>

#### mapxResolversApp.view\_geojson\_create(opt) ⇒ <code>Object</code>
Add geojson.
( Other supported file type may be supported )

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - view  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.data | <code>String</code> \| <code>Object</code> \| <code>Buffer</code> | Data : String, |
| opt.save | <code>Boolean</code> | Save locally, so next session the date will be loaded |
| opt.fileType | <code>String</code> | File type. e.g. geojson. default = geojson |
| opt.fileName | <code>String</code> | File name, if any |
| opt.title | <code>Sring</code> | Title |
| opt.abstract | <code>String</code> | Abstract |
| opt.random | <code>Object</code> | Generate random geojson |
| opt.random.n | <code>Number</code> | number of points |
| opt.random.latRange | <code>Array</code> | [minLat, maxLat] |
| opt.random.lngRange | <code>Array</code> | [minLng, maxLng] |

<a name="MapxResolversStatic+view_geojson_set_style"></a>

#### mapxResolversApp.view\_geojson\_set\_style(opt) ⇒ <code>Boolean</code>
Set geojson view layers style : layout and paint

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view |
| opt.layout | <code>Object</code> | Mapbox-gl layout object e.g. {'visibility','none'}; |
| opt.paint | <code>Object</code> | Mapbox-gl paint object. e.g. {'fill-color':'red'}; |

<a name="MapxResolversStatic+view_geojson_delete"></a>

#### mapxResolversApp.view\_geojson\_delete(opt) ⇒ <code>Boolean</code>
Delete view geojson
Works with all view, but not permanently.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view to delete. |

<a name="MapxResolversStatic+set_features_click_sdk_only"></a>

#### mapxResolversApp.set\_features\_click\_sdk\_only(opt) ⇒ <code>Array</code>
Set map feature click handler to sdk only
A listener could be set to listen to 'click_attributes' events. e.g. mapx.on('click_attributes')
if this option is enabled, only the SDK will receive the attribute table.

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Enabled modes  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable sdk only |
| opt.toggle | <code>Boolean</code> | Toggle this mode |

<a name="MapxResolversStatic+get_features_click_handlers"></a>

#### mapxResolversApp.get\_features\_click\_handlers() ⇒ <code>Array</code>
Get map feature click handlers id

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Enabled modes  
<a name="MapxResolversStatic+map_fly_to"></a>

#### mapxResolversApp.map\_fly\_to(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Map flyTo position with flying animation

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - When moveend, the options  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto |

**Example**  
```js
mapx.ask('map_fly_to',{center:[46,23], zoom:5});
```
<a name="MapxResolversStatic+map_jump_to"></a>

#### mapxResolversApp.map\_jump\_to(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Map jumpTo position, without animation

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - When moveend, the options  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#jumpto |

**Example**  
```js
mapx.ask('set_map_jump_to',{lat:46,lng:23, zoom:5});
```
<a name="MapxResolversStatic+map_get_zoom"></a>

#### mapxResolversApp.map\_get\_zoom() ⇒ <code>Float</code>
Get current map zoom

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Float</code> - zoom  
<a name="MapxResolversStatic+map_get_center"></a>

#### mapxResolversApp.map\_get\_center() ⇒ <code>Object</code>
Get current map center

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Object</code> - center  
<a name="MapxResolversStatic+map_get_bounds_array"></a>

#### mapxResolversApp.map\_get\_bounds\_array() ⇒ <code>Array</code>
Get current map bounds as array

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Bounds [west, south, east, north]  
<a name="MapxResolversStatic+map_set_bounds_array"></a>

#### mapxResolversApp.map\_set\_bounds\_array(opt)
Set current map bounds

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.bounds | <code>array</code> | [west, south, east, north] |

<a name="MapxResolversStatic+map_get_max_bounds_array"></a>

#### mapxResolversApp.map\_get\_max\_bounds\_array() ⇒ <code>Array</code> \| <code>null</code>
Get current max bounds / world

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> \| <code>null</code> - bounds [west, south, east, north] or null  
<a name="MapxResolversStatic+map_set_max_bounds_array"></a>

#### mapxResolversApp.map\_set\_max\_bounds\_array(opt) ⇒ <code>boolean</code>
Set current max bounds / world

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.bounds | <code>array</code> | [west, south, east, north] If empty or null = reset |

<a name="MapxResolversStatic+map"></a>

#### mapxResolversApp.map(opt) ⇒ <code>Promise.&lt;(Any\|Boolean)&gt;</code>
Generic map (mapbox-gl-js) methods
This gives you low level access to the `map` methods. Most methods work, but not all.
see https://docs.mapbox.com/mapbox-gl-js/api/map for all references

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;(Any\|Boolean)&gt;</code> - If returned value can be parsed, the value. If not, true;  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.method | <code>String</code> | Method/Instance member name (ex. `setPaintProperty`); |
| opt.parameters | <code>Array</code> | Array of parameters (ex. "['background', 'background-color', '#faafee']") |

**Example**  
```js
mapx.ask('map',{
   method: 'setPaintProperty',
   parameters : ['background', 'background-color', '#faafee']
}).then(console.table);
```
<a name="MapxResolversStatic+map_wait_idle"></a>

#### mapxResolversApp.map\_wait\_idle() ⇒ <code>Boolean</code>
Async wait for map idle

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Boolean</code> - Map is idle  
<a name="MapxResolversStatic+common_loc_get_list_codes"></a>

#### mapxResolversApp.common\_loc\_get\_list\_codes() ⇒ <code>Array</code>
Get list of common location codes
Codes as defined in ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes (ex. m49_901)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Array</code> - Array of codes as strings  
<a name="MapxResolversStatic+common_loc_get_table_codes"></a>

#### mapxResolversApp.common\_loc\_get\_table\_codes(opt) ⇒ <code>Promise.&lt;Array&gt;</code>
Get table of common location codes and names
Same as common_loc_get_list_codes, but with names in set language. ex. [{code:"ABW",name:"Aruba"},...]

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of codes and name as object  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.language | <code>String</code> | Language (ISO 639-1 two letters code, default 'en') |

**Example**  
```js
mapx.ask('common_loc_get_table_codes',{
   language: english
}).then(console.table);
// code  name
// -----------------
// ABW   Aruba
// AFG   Afghanistan
// AGO   Angola
// AIA   Anguilla
```
<a name="MapxResolversStatic+common_loc_get_bbox"></a>

#### mapxResolversApp.common\_loc\_get\_bbox(o) ⇒ <code>Promise.&lt;Array&gt;</code>
Get Bounding box for code iso3, m49 and text + language

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of geographic bounds [west, south, east, north]  

| Param | Type | Description |
| --- | --- | --- |
| o | <code>Object</code> | options |
| o.code | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004' |
| o.name | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh |

<a name="MapxResolversStatic+common_loc_fit_bbox"></a>

#### mapxResolversApp.common\_loc\_fit\_bbox(o) ⇒ <code>Promise.&lt;Array&gt;</code>
Set map bounding box based on code (ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes) or name (ex. Africa)

**Kind**: instance method of [<code>MapxResolversApp</code>](#MapxResolversApp)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of geographic bounds [west, south, east, north]  

| Param | Type | Description |
| --- | --- | --- |
| o | <code>Object</code> | options |
| o.code | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004' |
| o.name | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh |
| o.param | <code>Object</code> | Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions |

<a name="MapxResolversPanels"></a>

### MapxResolversPanels ⇐ <code>ResolversBase</code>
MapX resolvers for interacting with panels

**Kind**: global class  
**Extends**: <code>ResolversBase</code>  

* [MapxResolversPanels](#MapxResolversPanels) ⇐ <code>ResolversBase</code>
    * [.panels_batch(config)](#MapxResolversPanels+panels_batch) ⇒ <code>void</code>
    * [.panels_state()](#MapxResolversPanels+panels_state) ⇒ <code>Object</code>
    * [.panels_list()](#MapxResolversPanels+panels_list) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
    * [.panels_close_all()](#MapxResolversPanels+panels_close_all) ⇒ <code>void</code>
    * [.panels_open_all()](#MapxResolversPanels+panels_open_all) ⇒ <code>void</code>
    * [.panels_hide_all()](#MapxResolversPanels+panels_hide_all) ⇒ <code>void</code>
    * [.panels_show_all()](#MapxResolversPanels+panels_show_all) ⇒ <code>void</code>
    * [.panels_is_open(id)](#MapxResolversPanels+panels_is_open) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_closed(id)](#MapxResolversPanels+panels_is_closed) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_visible(id)](#MapxResolversPanels+panels_is_visible) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_hidden(id)](#MapxResolversPanels+panels_is_hidden) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="MapxResolversPanels+panels_batch"></a>

#### mapxResolversPanels.panels\_batch(config) ⇒ <code>void</code>
Applies a batch state to panels based on the provided configuration.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | The configuration object that maps panel IDs to their desired state. |

**Example**  
```js
// Example usage :
mapx.ask('panels_batch',{
    "controls_panel": {
      "show": true,
      "open": true
    }
  }
});
```
<a name="MapxResolversPanels+panels_state"></a>

#### mapxResolversPanels.panels\_state() ⇒ <code>Object</code>
Retrieves current state.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Object</code> - config - The configuration object that maps panel IDs to their desired state.  
**Example**  
```js
// Example usage :
const state = await mapx.ask('panels_state');
console.log(state);
//  {
//  "controls_panel": {
//   "hide": false,
//   "open": true
//   }
//  }
```
<a name="MapxResolversPanels+panels_list"></a>

#### mapxResolversPanels.panels\_list() ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
Lists all registered panel IDs.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Promise.&lt;Array.&lt;string&gt;&gt;</code> - A promise that resolves to an array of panel IDs.  
**Example**  
```js
const panelIds = await mapx.ask('panels_list');
console.log(panelIds);  // Outputs: ['panel_1', 'panel_2', ...]
```
<a name="MapxResolversPanels+panels_close_all"></a>

#### mapxResolversPanels.panels\_close\_all() ⇒ <code>void</code>
Closes all registered panels.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
<a name="MapxResolversPanels+panels_open_all"></a>

#### mapxResolversPanels.panels\_open\_all() ⇒ <code>void</code>
Opens all registered panels.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
<a name="MapxResolversPanels+panels_hide_all"></a>

#### mapxResolversPanels.panels\_hide\_all() ⇒ <code>void</code>
Hides all registered panels.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
<a name="MapxResolversPanels+panels_show_all"></a>

#### mapxResolversPanels.panels\_show\_all() ⇒ <code>void</code>
Shows all registered panels.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
<a name="MapxResolversPanels+panels_is_open"></a>

#### mapxResolversPanels.panels\_is\_open(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is open.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is open, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_closed"></a>

#### mapxResolversPanels.panels\_is\_closed(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is closed.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is closed, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_visible"></a>

#### mapxResolversPanels.panels\_is\_visible(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is visible.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is visible, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_hidden"></a>

#### mapxResolversPanels.panels\_is\_hidden(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is hidden.

**Kind**: instance method of [<code>MapxResolversPanels</code>](#MapxResolversPanels)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is hidden, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversStatic"></a>

### MapxResolversStatic ⇐ [<code>MapxResolversPanels</code>](#MapxResolversPanels)
MapX resolvers available in static and app

**Kind**: global class  
**Extends**: [<code>MapxResolversPanels</code>](#MapxResolversPanels)  

* [MapxResolversStatic](#MapxResolversStatic) ⇐ [<code>MapxResolversPanels</code>](#MapxResolversPanels)
    * [.get_sdk_methods()](#MapxResolversStatic+get_sdk_methods) ⇒ <code>Array</code>
    * [.set_panel_left_visibility(opt)](#MapxResolversStatic+set_panel_left_visibility) ⇒ <code>Boolean</code>
    * [.has_dashboard()](#MapxResolversStatic+has_dashboard) ⇒ <code>Boolean</code>
    * [.tests_ws()](#MapxResolversStatic+tests_ws)
    * [.set_immersive_mode()](#MapxResolversStatic+set_immersive_mode) ⇒ <code>Boolean</code>
    * [.get_immersive_mode()](#MapxResolversStatic+get_immersive_mode) ⇒ <code>Boolean</code>
    * [.set_3d_terrain(opt)](#MapxResolversStatic+set_3d_terrain)
    * [.set_mode_3d(opt)](#MapxResolversStatic+set_mode_3d)
    * [.set_mode_aerial(opt)](#MapxResolversStatic+set_mode_aerial)
    * [.show_modal_share(opt)](#MapxResolversStatic+show_modal_share) ⇒ <code>Boolean</code>
    * [.close_modal_share()](#MapxResolversStatic+close_modal_share) ⇒ <code>Boolean</code>
    * [.get_modal_share_string()](#MapxResolversStatic+get_modal_share_string) ⇒ <code>String</code>
    * [.get_modal_share_tests()](#MapxResolversStatic+get_modal_share_tests) ⇒ <code>array</code>
    * [.set_theme(opt)](#MapxResolversStatic+set_theme) ⇒ <code>Boolean</code>
    * [.get_themes_id()](#MapxResolversStatic+get_themes_id) ⇒ <code>Array</code>
    * [.get_themes()](#MapxResolversStatic+get_themes) ⇒ <code>Object</code>
    * [.get_theme_id()](#MapxResolversStatic+get_theme_id) ⇒ <code>string</code>
    * [.get_themes_ids()](#MapxResolversStatic+get_themes_ids) ⇒ <code>Array.&lt;string&gt;</code>
    * [.add_theme(opt)](#MapxResolversStatic+add_theme) ⇒ <code>Boolean</code>
    * [.has_el_id(opt)](#MapxResolversStatic+has_el_id)
    * [.set_dashboard_visibility(opt)](#MapxResolversStatic+set_dashboard_visibility) ⇒ <code>Boolean</code>
    * [.is_dashboard_visible()](#MapxResolversStatic+is_dashboard_visible) ⇒ <code>Boolean</code>
    * [.get_source_meta(opt)](#MapxResolversStatic+get_source_meta) ⇒ <code>Object</code>
    * [.get_view_source_summary(opt)](#MapxResolversStatic+get_view_source_summary) ⇒ <code>Object</code>
    * [.get_user_ip()](#MapxResolversStatic+get_user_ip) ⇒ <code>Object</code>
    * [.get_language()](#MapxResolversStatic+get_language) ⇒ <code>String</code>
    * [.set_language(opt)](#MapxResolversStatic+set_language) ⇒ <code>Boolean</code>
    * [.get_languages()](#MapxResolversStatic+get_languages) ⇒ <code>Array</code>
    * [.get_views()](#MapxResolversStatic+get_views) ⇒ <code>Array</code>
    * [.get_views_id()](#MapxResolversStatic+get_views_id) ⇒ <code>Array</code>
    * [.get_view_meta_vt_attribute(opt)](#MapxResolversStatic+get_view_meta_vt_attribute) ⇒ <code>Object</code>
    * [.get_view_meta(opt, view)](#MapxResolversStatic+get_view_meta) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.get_view_table_attribute_config(opt)](#MapxResolversStatic+get_view_table_attribute_config) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.get_view_table_attribute_url(opt)](#MapxResolversStatic+get_view_table_attribute_url) ⇒ <code>Promise.&lt;String&gt;</code>
    * [.get_view_table_attribute(opt)](#MapxResolversStatic+get_view_table_attribute) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.get_view_legend_image(opt)](#MapxResolversStatic+get_view_legend_image) ⇒ <code>String</code>
    * [.set_view_legend_state(opt)](#MapxResolversStatic+set_view_legend_state) ⇒ <code>void</code> \| <code>Error</code>
    * [.get_view_legend_state(opt)](#MapxResolversStatic+get_view_legend_state) ⇒ <code>Array</code> \| <code>Error</code>
    * [.get_view_legend_values(opt)](#MapxResolversStatic+get_view_legend_values) ⇒ <code>Array</code>
    * [.set_views_layer_order(opt)](#MapxResolversStatic+set_views_layer_order) ⇒ <code>Boolean</code>
    * [.get_views_layer_order()](#MapxResolversStatic+get_views_layer_order) ⇒ <code>Array</code>
    * [.get_views_with_visible_layer()](#MapxResolversStatic+get_views_with_visible_layer) ⇒ <code>Array</code>
    * [.set_view_layer_filter_text(opt)](#MapxResolversStatic+set_view_layer_filter_text) ⇒ <code>void</code>
    * [.get_view_layer_filter_text(opt)](#MapxResolversStatic+get_view_layer_filter_text) ⇒ <code>array</code>
    * [.set_view_layer_filter_numeric(opt)](#MapxResolversStatic+set_view_layer_filter_numeric) ⇒ <code>void</code>
    * [.get_view_layer_filter_numeric(opt)](#MapxResolversStatic+get_view_layer_filter_numeric) ⇒ <code>Number</code> \| <code>Array</code>
    * [.set_view_layer_filter_time(opt)](#MapxResolversStatic+set_view_layer_filter_time) ⇒ <code>void</code>
    * [.get_view_layer_filter_time(opt)](#MapxResolversStatic+get_view_layer_filter_time) ⇒ <code>Number</code> \| <code>Array</code>
    * [.set_view_layer_transparency(opt)](#MapxResolversStatic+set_view_layer_transparency) ⇒ <code>void</code>
    * [.get_view_layer_transparency(opt)](#MapxResolversStatic+get_view_layer_transparency) ⇒ <code>Number</code>
    * [.view_add(opt)](#MapxResolversStatic+view_add) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.view_remove(opt)](#MapxResolversStatic+view_remove) ⇒ <code>Boolean</code>
    * [.download_view_source_external(opt)](#MapxResolversStatic+download_view_source_external) ⇒ <code>Object</code>
    * [.download_view_source_raster()](#MapxResolversStatic+download_view_source_raster)
    * [.download_view_source_vector(opt)](#MapxResolversStatic+download_view_source_vector) ⇒ <code>Object</code>
    * [.close_modal_download_vector()](#MapxResolversStatic+close_modal_download_vector) ⇒ <code>Boolean</code>
    * [.download_view_source_geojson(opt)](#MapxResolversStatic+download_view_source_geojson) ⇒ <code>Object</code>
    * [.show_modal_map_composer()](#MapxResolversStatic+show_modal_map_composer) ⇒ <code>Boolean</code>
    * [.close_modal_all()](#MapxResolversStatic+close_modal_all) ⇒ <code>Boolean</code>
    * [.get_views_title(opt)](#MapxResolversStatic+get_views_title) ⇒ <code>Array</code>
    * [.set_vector_spotlight(opt)](#MapxResolversStatic+set_vector_spotlight) ⇒ <code>Object</code>
    * [.set_highlighter(opt)](#MapxResolversStatic+set_highlighter) ⇒ <code>number</code>
    * [.update_highlighter()](#MapxResolversStatic+update_highlighter) ⇒ <code>number</code>
    * [.reset_highlighter()](#MapxResolversStatic+reset_highlighter) ⇒ <code>number</code>
    * [.view_geojson_create(opt)](#MapxResolversStatic+view_geojson_create) ⇒ <code>Object</code>
    * [.view_geojson_set_style(opt)](#MapxResolversStatic+view_geojson_set_style) ⇒ <code>Boolean</code>
    * [.view_geojson_delete(opt)](#MapxResolversStatic+view_geojson_delete) ⇒ <code>Boolean</code>
    * [.set_features_click_sdk_only(opt)](#MapxResolversStatic+set_features_click_sdk_only) ⇒ <code>Array</code>
    * [.get_features_click_handlers()](#MapxResolversStatic+get_features_click_handlers) ⇒ <code>Array</code>
    * [.map_fly_to(opt)](#MapxResolversStatic+map_fly_to) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.map_jump_to(opt)](#MapxResolversStatic+map_jump_to) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.map_get_zoom()](#MapxResolversStatic+map_get_zoom) ⇒ <code>Float</code>
    * [.map_get_center()](#MapxResolversStatic+map_get_center) ⇒ <code>Object</code>
    * [.map_get_bounds_array()](#MapxResolversStatic+map_get_bounds_array) ⇒ <code>Array</code>
    * [.map_set_bounds_array(opt)](#MapxResolversStatic+map_set_bounds_array)
    * [.map_get_max_bounds_array()](#MapxResolversStatic+map_get_max_bounds_array) ⇒ <code>Array</code> \| <code>null</code>
    * [.map_set_max_bounds_array(opt)](#MapxResolversStatic+map_set_max_bounds_array) ⇒ <code>boolean</code>
    * [.map(opt)](#MapxResolversStatic+map) ⇒ <code>Promise.&lt;(Any\|Boolean)&gt;</code>
    * [.map_wait_idle()](#MapxResolversStatic+map_wait_idle) ⇒ <code>Boolean</code>
    * [.common_loc_get_list_codes()](#MapxResolversStatic+common_loc_get_list_codes) ⇒ <code>Array</code>
    * [.common_loc_get_table_codes(opt)](#MapxResolversStatic+common_loc_get_table_codes) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.common_loc_get_bbox(o)](#MapxResolversStatic+common_loc_get_bbox) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.common_loc_fit_bbox(o)](#MapxResolversStatic+common_loc_fit_bbox) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [.panels_batch(config)](#MapxResolversPanels+panels_batch) ⇒ <code>void</code>
    * [.panels_state()](#MapxResolversPanels+panels_state) ⇒ <code>Object</code>
    * [.panels_list()](#MapxResolversPanels+panels_list) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
    * [.panels_close_all()](#MapxResolversPanels+panels_close_all) ⇒ <code>void</code>
    * [.panels_open_all()](#MapxResolversPanels+panels_open_all) ⇒ <code>void</code>
    * [.panels_hide_all()](#MapxResolversPanels+panels_hide_all) ⇒ <code>void</code>
    * [.panels_show_all()](#MapxResolversPanels+panels_show_all) ⇒ <code>void</code>
    * [.panels_is_open(id)](#MapxResolversPanels+panels_is_open) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_closed(id)](#MapxResolversPanels+panels_is_closed) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_visible(id)](#MapxResolversPanels+panels_is_visible) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.panels_is_hidden(id)](#MapxResolversPanels+panels_is_hidden) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="MapxResolversStatic+get_sdk_methods"></a>

#### mapxResolversStatic.get\_sdk\_methods() ⇒ <code>Array</code>
List resolvers methods

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - array of supported methods  
<a name="MapxResolversStatic+set_panel_left_visibility"></a>

#### mapxResolversStatic.set\_panel\_left\_visibility(opt) ⇒ <code>Boolean</code>
Set panel visibility

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.show | <code>Boolean</code> | Show the panel. If false, hide. |
| opt.open | <code>Boolean</code> | Open the panel. If false, close. |
| opt.toggle | <code>Boolean</code> | If closed, open. If open, close. |

<a name="MapxResolversStatic+has_dashboard"></a>

#### mapxResolversStatic.has\_dashboard() ⇒ <code>Boolean</code>
Test if dashboard exists

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - exists  
<a name="MapxResolversStatic+tests_ws"></a>

#### mapxResolversStatic.tests\_ws()
End to end ws com testing

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversStatic+set_immersive_mode"></a>

#### mapxResolversStatic.set\_immersive\_mode() ⇒ <code>Boolean</code>
Toogle immersive mode: hide or show ALL panels.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - enabled  
**Aram**: <code>Object</code> opt Options  

| Param | Type | Description |
| --- | --- | --- |
| opt.enable | <code>Boolean</code> | Force enable |
| opt.toggle | <code>Boolean</code> | Toggle |

<a name="MapxResolversStatic+get_immersive_mode"></a>

#### mapxResolversStatic.get\_immersive\_mode() ⇒ <code>Boolean</code>
Get immersive mode state

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Enabled  
<a name="MapxResolversStatic+set_3d_terrain"></a>

#### mapxResolversStatic.set\_3d\_terrain(opt)
Enable or disable 3d terrain

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'enable','disable','toggle' |

<a name="MapxResolversStatic+set_mode_3d"></a>

#### mapxResolversStatic.set\_mode\_3d(opt)
Enable or disable 3d terrain
Set related layers visibility, change control buttons state

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'show','hide','toggle' |

<a name="MapxResolversStatic+set_mode_aerial"></a>

#### mapxResolversStatic.set\_mode\_aerial(opt)
Enable or disable aerial/satelite mode
Set related layers visibility, change control buttons state

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.action | <code>String</code> | Action to perform: 'show','hide','toggle' |

<a name="MapxResolversStatic+show_modal_share"></a>

#### mapxResolversStatic.show\_modal\_share(opt) ⇒ <code>Boolean</code>
Show sharing modal

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> \| <code>Array</code> | Id view to share |

<a name="MapxResolversStatic+close_modal_share"></a>

#### mapxResolversStatic.close\_modal\_share() ⇒ <code>Boolean</code>
Close sharing modal

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Done  
<a name="MapxResolversStatic+get_modal_share_string"></a>

#### mapxResolversStatic.get\_modal\_share\_string() ⇒ <code>String</code>
Get sharing string

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>String</code> - Sharing string ( code / url )  
<a name="MapxResolversStatic+get_modal_share_tests"></a>

#### mapxResolversStatic.get\_modal\_share\_tests() ⇒ <code>array</code>
Modal Share Tests Suite

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>array</code> - array of tests  
<a name="MapxResolversStatic+set_theme"></a>

#### mapxResolversStatic.set\_theme(opt) ⇒ <code>Boolean</code>
Set MapX theme by id or set custom colors.
Both ways are exclusive.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idTheme | <code>String</code> | Valid theme id. Use 'get_themes_id' to get a list |
| opt.colors | <code>Object</code> | Valid colors scheme. Use 'get_themes' to see default themes structure. |

<a name="MapxResolversStatic+get_themes_id"></a>

#### mapxResolversStatic.get\_themes\_id() ⇒ <code>Array</code>
Get themes id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - array of themes id  
<a name="MapxResolversStatic+get_themes"></a>

#### mapxResolversStatic.get\_themes() ⇒ <code>Object</code>
Get all themes

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - Themes object with themes id as key  
<a name="MapxResolversStatic+get_theme_id"></a>

#### mapxResolversStatic.get\_theme\_id() ⇒ <code>string</code>
Get current theme id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>string</code> - Theme id  
<a name="MapxResolversStatic+get_themes_ids"></a>

#### mapxResolversStatic.get\_themes\_ids() ⇒ <code>Array.&lt;string&gt;</code>
Get all theme id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array.&lt;string&gt;</code> - Theme ids  
<a name="MapxResolversStatic+add_theme"></a>

#### mapxResolversStatic.add\_theme(opt) ⇒ <code>Boolean</code>
Add a custom theme into mapx and use it.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.theme | <code>String</code> | Valid theme (full). |

<a name="MapxResolversStatic+has_el_id"></a>

#### mapxResolversStatic.has\_el\_id(opt)
Check if element is visible, by id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.id | <code>String</code> | Id of the element to check |
| opt.timeout | <code>Number</code> | Timeout |

<a name="MapxResolversStatic+set_dashboard_visibility"></a>

#### mapxResolversStatic.set\_dashboard\_visibility(opt) ⇒ <code>Boolean</code>
Set dashboard visibility

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.show | <code>Boolean</code> | If true, show the dashboard |
| opt.toggle | <code>Boolean</code> | Toggle the dashoard |

<a name="MapxResolversStatic+is_dashboard_visible"></a>

#### mapxResolversStatic.is\_dashboard\_visible() ⇒ <code>Boolean</code>
Check if the dashboard is visible

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - The dashboard is visible  
<a name="MapxResolversStatic+get_source_meta"></a>

#### mapxResolversStatic.get\_source\_meta(opt) ⇒ <code>Object</code>
Get source metadata

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - Source MapX metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idSource | <code>String</code> | Id of the source |

<a name="MapxResolversStatic+get_view_source_summary"></a>

#### mapxResolversStatic.get\_view\_source\_summary(opt) ⇒ <code>Object</code>
Get view's source summary

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - Source summary  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |
| opt.stats | <code>Array</code> | Stats to retrieve. ['base', 'attributes', 'temporal', 'spatial'] |
| opt.idAttr | <code>String</code> | Attribute for stat (default = attrbute of the style) |

<a name="MapxResolversStatic+get_user_ip"></a>

#### mapxResolversStatic.get\_user\_ip() ⇒ <code>Object</code>
Get user ip info

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - Current user ip object (ip, country, region, etc)  
<a name="MapxResolversStatic+get_language"></a>

#### mapxResolversStatic.get\_language() ⇒ <code>String</code>
Get current language

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>String</code> - Two letters language code  
<a name="MapxResolversStatic+set_language"></a>

#### mapxResolversStatic.set\_language(opt) ⇒ <code>Boolean</code>
Setlanguage

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Laguage change process finished  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.lang | <code>String</code> | Two letters language code |

<a name="MapxResolversStatic+get_languages"></a>

#### mapxResolversStatic.get\_languages() ⇒ <code>Array</code>
Get list of supported current languages

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of two letters language code  
<a name="MapxResolversStatic+get_views"></a>

#### mapxResolversStatic.get\_views() ⇒ <code>Array</code>
Get list of available views as static objects

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+get_views_id"></a>

#### mapxResolversStatic.get\_views\_id() ⇒ <code>Array</code>
Get list of available views id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolversStatic+get_view_meta_vt_attribute"></a>

#### mapxResolversStatic.get\_view\_meta\_vt\_attribute(opt) ⇒ <code>Object</code>
Get vector view (vt) metadata of the attribute

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - attribut metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_meta"></a>

#### mapxResolversStatic.get\_view\_meta(opt, view) ⇒ <code>Promise.&lt;Object&gt;</code>
Get view metadata

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - view metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| view | <code>Object</code> | meta data object |

<a name="MapxResolversStatic+get_view_table_attribute_config"></a>

#### mapxResolversStatic.get\_view\_table\_attribute\_config(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Get view table attribute config

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - view attribute config  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_table_attribute_url"></a>

#### mapxResolversStatic.get\_view\_table\_attribute\_url(opt) ⇒ <code>Promise.&lt;String&gt;</code>
Get view table attribute url

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_table_attribute"></a>

#### mapxResolversStatic.get\_view\_table\_attribute(opt) ⇒ <code>Array.&lt;Object&gt;</code>
Get view table attribute

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolversStatic+get_view_legend_image"></a>

#### mapxResolversStatic.get\_view\_legend\_image(opt) ⇒ <code>String</code>
Get view legend

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>String</code> - PNG in base64 format  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| opt.format | <code>String</code> |  |

<a name="MapxResolversStatic+set_view_legend_state"></a>

#### mapxResolversStatic.set\_view\_legend\_state(opt) ⇒ <code>void</code> \| <code>Error</code>
Updates the state of a view's legend with the provided values.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>void</code> \| <code>Error</code> - Returns nothing if successful or an error if there's no LegendVt instance.  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view object containing the legend instance. |
| opt.values | <code>Array</code> | An array of values to set the legend's state. |

<a name="MapxResolversStatic+get_view_legend_state"></a>

#### mapxResolversStatic.get\_view\_legend\_state(opt) ⇒ <code>Array</code> \| <code>Error</code>
Retrieves the current state (checked values) of a view's legend.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> \| <code>Error</code> - An array of the currently checked values in the legend, or an error if there's no LegendVt instance.  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view id containing the legend instance. |

<a name="MapxResolversStatic+get_view_legend_values"></a>

#### mapxResolversStatic.get\_view\_legend\_values(opt) ⇒ <code>Array</code>
Retrieves the values from the legend.

For numeric rules, the method returns an array of range arrays ([from, to]),
otherwise, it just returns an array of values.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - An array of checked values. For numeric rules, each entry is an array of format [from, to].  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> \| <code>Object</code> | The view id containing the legend instance. |

**Example**  
```js
// Non-numeric rules
get_view_legend_values({view:"123"}); // e.g. ["value1", "value2", ...]

// Numeric rules
get_view_legend_values({view:"123"}); // e.g. [[0, 10], [10, 20], ...]
```
<a name="MapxResolversStatic+set_views_layer_order"></a>

#### mapxResolversStatic.set\_views\_layer\_order(opt) ⇒ <code>Boolean</code>
Set view layer z position

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.order | <code>Array.&lt;String&gt;</code> | View order |
| opt.orig | <code>String</code> | Optional label for origin / logs |

**Example**  
```js
const views = await mapx.ask("get_views_with_visible_layer");
const order = views.toReversed();
const result = await mapx.ask("set_views_layer_order",{order});
```
<a name="MapxResolversStatic+get_views_layer_order"></a>

#### mapxResolversStatic.get\_views\_layer\_order() ⇒ <code>Array</code>
Get list views with visible layers

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+get_views_with_visible_layer"></a>

#### mapxResolversStatic.get\_views\_with\_visible\_layer() ⇒ <code>Array</code>
Get list views with visible layers (alias)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolversStatic+set_view_layer_filter_text"></a>

#### mapxResolversStatic.set\_view\_layer\_filter\_text(opt) ⇒ <code>void</code>
Filter view layer by text (if attribute is text)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | View id |
| opt.values | <code>array</code> | Values to use as filter |
| opt.attribute | <code>string</code> | Attribute to use as filter (default from style) |

<a name="MapxResolversStatic+get_view_layer_filter_text"></a>

#### mapxResolversStatic.get\_view\_layer\_filter\_text(opt) ⇒ <code>array</code>
Get current text filter values for a given view

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt.idView | <code>String</code> | View id |
| opt | <code>Options</code> | Options |

<a name="MapxResolversStatic+set_view_layer_filter_numeric"></a>

#### mapxResolversStatic.set\_view\_layer\_filter\_numeric(opt) ⇒ <code>void</code>
Filter view layer by numeric (if attribute is numeric)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.attribute | <code>String</code> | Attribute name (default from style) |
| opt.from | <code>Numeric</code> | Value |
| opt.to | <code>Numeric</code> | Value |
| opt.value | <code>array</code> | Values (Deprecated) |

<a name="MapxResolversStatic+get_view_layer_filter_numeric"></a>

#### mapxResolversStatic.get\_view\_layer\_filter\_numeric(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current numeric slider value

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+set_view_layer_filter_time"></a>

#### mapxResolversStatic.set\_view\_layer\_filter\_time(opt) ⇒ <code>void</code>
Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )

This function creates a time filter based on the provided options
and sets this filter to the specific view identified by its ID.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | The options for the time filter. |
| opt.hasT0 | <code>boolean</code> | Flag indicating if the 'mx_t0' timestamp exists. |
| opt.hasT1 | <code>boolean</code> | Flag indicating if the 'mx_t1' timestamp exists. |
| opt.from | <code>number</code> | The 'from' timestamp for the filter in milliseconds. |
| opt.to | <code>number</code> | The 'to' timestamp for the filter in milliseconds. |
| opt.idView | <code>string</code> | The ID of the view to which the filter is to be applied. |

**Example**  
```js
// Get summary ( any attribute: get_view_source_summary returns time extent
// by default )
const summary = await mapx.ask("get_view_source_summary", {
 idView,
 idAttr: idAttr,
 });
// set config + convert seconds -> milliseconds
const start = summary.extent_time.min * 1000;
const end = summary.extent_time.max * 1000;
const hasT0 = summary.attributes.includes("mx_t0");
const hasT1 = summary.attributes.includes("mx_t1");
await mapx.ask("set_view_layer_filter_time", {
 idView,
 from,
 to,
 hasT0,
 hasT1,
});
```
<a name="MapxResolversStatic+get_view_layer_filter_time"></a>

#### mapxResolversStatic.get\_view\_layer\_filter\_time(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current time slider value

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+set_view_layer_transparency"></a>

#### mapxResolversStatic.set\_view\_layer\_transparency(opt) ⇒ <code>void</code>
Set layer transarency (0 : visible, 100 : 100% transparent)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolversStatic+get_view_layer_transparency"></a>

#### mapxResolversStatic.get\_view\_layer\_transparency(opt) ⇒ <code>Number</code>
Get current transparency value for layers of a view

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Number</code> - value  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+view_add"></a>

#### mapxResolversStatic.view\_add(opt) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Add a view

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.zoomToView | <code>Boolean</code> | Fly to view extends |

<a name="MapxResolversStatic+view_remove"></a>

#### mapxResolversStatic.view\_remove(opt) ⇒ <code>Boolean</code>
remove a view

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolversStatic+download_view_source_external"></a>

#### mapxResolversStatic.download\_view\_source\_external(opt) ⇒ <code>Object</code>
Get the download links of an external source set in metadata (custom code, raster, etc)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - input options, with new key : url. E.g. {idView:<abc>,url:<first url>,urlItems:[{<url>,<label>,<is_download_link>}]}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | view view id |

<a name="MapxResolversStatic+download_view_source_raster"></a>

#### mapxResolversStatic.download\_view\_source\_raster()
Get the download link of the raster source (same as download_view_source_external)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversStatic+download_view_source_vector"></a>

#### mapxResolversStatic.download\_view\_source\_vector(opt) ⇒ <code>Object</code>
Open the download modal for vector views

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Vector view id |

<a name="MapxResolversStatic+close_modal_download_vector"></a>

#### mapxResolversStatic.close\_modal\_download\_vector() ⇒ <code>Boolean</code>
Close download vector modal

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Done  
<a name="MapxResolversStatic+download_view_source_geojson"></a>

#### mapxResolversStatic.download\_view\_source\_geojson(opt) ⇒ <code>Object</code>
Get the data from geojson view or download geojsn as a file

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>, data:<data (if mode = data)>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | GeoJSON view id |
| opt.mode | <code>String</code> | "file" or "data" |

<a name="MapxResolversStatic+show_modal_map_composer"></a>

#### mapxResolversStatic.show\_modal\_map\_composer() ⇒ <code>Boolean</code>
Show map composer

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversStatic+close_modal_all"></a>

#### mapxResolversStatic.close\_modal\_all() ⇒ <code>Boolean</code>
close all modal windows

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolversStatic+get_views_title"></a>

#### mapxResolversStatic.get\_views\_title(opt) ⇒ <code>Array</code>
Get list of views title

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of titles (string)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.views | <code>Array</code> | List of views or views id |
| opt.lang | <code>String</code> | Language code |

<a name="MapxResolversStatic+set_vector_spotlight"></a>

#### mapxResolversStatic.set\_vector\_spotlight(opt) ⇒ <code>Object</code>
Spotlight vector feature : Enable, disable, toggle

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - options realised {enable:<false/true>,calcArea:<true/false>,nLayers:<n>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable or disable. If not set, toggle spotlight |
| opt.nLayers | <code>Number</code> | Numbers of layer that are used in the overlap tool. If not set, the default is 1 : any visible feature is spotlighted. If 0 = only part where all displayed layers are overlapping are spotligthed |
| opt.calcArea | <code>Boolean</code> | Estimate area covered by visible feature and display result in MapX interface |

<a name="MapxResolversStatic+set_highlighter"></a>

#### mapxResolversStatic.set\_highlighter(opt) ⇒ <code>number</code>
Set the highlighter with the provided options.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>number</code> - Feature count  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Configuration options for the highlighter. |
| config.point | <code>PointLike</code> \| <code>Array.&lt;PointLike&gt;</code> | Location to query |
| opt.filters | <code>Array.&lt;Object&gt;</code> | Array of filter objects to be applied. |
| opt.filters[].id | <code>String</code> | Identifier of the view to which the filter applies. |
| opt.filters[].filter | <code>Array</code> | MapboxGl filter expression |

**Example**  
```js
mapx.ask('set_highlighter',{
  all: true,
});

mapx.ask('set_highlighter',{
  filters: [
    { id: "MX-TC0O1-34A9Y-RYDJG", filter: ["<", ["get", "year"], 2000] },
  ],
});

mapx.ask('set_highlighter',{
  filters: [
    { id: "MX-TC0O1-34A9Y-RYDJG", filter: [">=", ["get", "fatalities"], 7000] },
  ],
});

mapx.ask('set_highlighter',{
  filters: [
    {
      id: "MX-TC0O1-34A9Y-RYDJG",
      filter: [
        "in",
        ["get", "country"],
        ["literal", ["Nigeria", "Gabon", "Angola"]],
      ],
    },
  ],
});
```
<a name="MapxResolversStatic+update_highlighter"></a>

#### mapxResolversStatic.update\_highlighter() ⇒ <code>number</code>
Update highlighter using previous configuration i.e refresh features

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>number</code> - Feature count  
<a name="MapxResolversStatic+reset_highlighter"></a>

#### mapxResolversStatic.reset\_highlighter() ⇒ <code>number</code>
Clear all highlighted features and reset config

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>number</code> - Feature count  
<a name="MapxResolversStatic+view_geojson_create"></a>

#### mapxResolversStatic.view\_geojson\_create(opt) ⇒ <code>Object</code>
Add geojson.
( Other supported file type may be supported )

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - view  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.data | <code>String</code> \| <code>Object</code> \| <code>Buffer</code> | Data : String, |
| opt.save | <code>Boolean</code> | Save locally, so next session the date will be loaded |
| opt.fileType | <code>String</code> | File type. e.g. geojson. default = geojson |
| opt.fileName | <code>String</code> | File name, if any |
| opt.title | <code>Sring</code> | Title |
| opt.abstract | <code>String</code> | Abstract |
| opt.random | <code>Object</code> | Generate random geojson |
| opt.random.n | <code>Number</code> | number of points |
| opt.random.latRange | <code>Array</code> | [minLat, maxLat] |
| opt.random.lngRange | <code>Array</code> | [minLng, maxLng] |

<a name="MapxResolversStatic+view_geojson_set_style"></a>

#### mapxResolversStatic.view\_geojson\_set\_style(opt) ⇒ <code>Boolean</code>
Set geojson view layers style : layout and paint

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view |
| opt.layout | <code>Object</code> | Mapbox-gl layout object e.g. {'visibility','none'}; |
| opt.paint | <code>Object</code> | Mapbox-gl paint object. e.g. {'fill-color':'red'}; |

<a name="MapxResolversStatic+view_geojson_delete"></a>

#### mapxResolversStatic.view\_geojson\_delete(opt) ⇒ <code>Boolean</code>
Delete view geojson
Works with all view, but not permanently.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view to delete. |

<a name="MapxResolversStatic+set_features_click_sdk_only"></a>

#### mapxResolversStatic.set\_features\_click\_sdk\_only(opt) ⇒ <code>Array</code>
Set map feature click handler to sdk only
A listener could be set to listen to 'click_attributes' events. e.g. mapx.on('click_attributes')
if this option is enabled, only the SDK will receive the attribute table.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Enabled modes  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable sdk only |
| opt.toggle | <code>Boolean</code> | Toggle this mode |

<a name="MapxResolversStatic+get_features_click_handlers"></a>

#### mapxResolversStatic.get\_features\_click\_handlers() ⇒ <code>Array</code>
Get map feature click handlers id

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Enabled modes  
<a name="MapxResolversStatic+map_fly_to"></a>

#### mapxResolversStatic.map\_fly\_to(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Map flyTo position with flying animation

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - When moveend, the options  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto |

**Example**  
```js
mapx.ask('map_fly_to',{center:[46,23], zoom:5});
```
<a name="MapxResolversStatic+map_jump_to"></a>

#### mapxResolversStatic.map\_jump\_to(opt) ⇒ <code>Promise.&lt;Object&gt;</code>
Map jumpTo position, without animation

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - When moveend, the options  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#jumpto |

**Example**  
```js
mapx.ask('set_map_jump_to',{lat:46,lng:23, zoom:5});
```
<a name="MapxResolversStatic+map_get_zoom"></a>

#### mapxResolversStatic.map\_get\_zoom() ⇒ <code>Float</code>
Get current map zoom

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Float</code> - zoom  
<a name="MapxResolversStatic+map_get_center"></a>

#### mapxResolversStatic.map\_get\_center() ⇒ <code>Object</code>
Get current map center

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - center  
<a name="MapxResolversStatic+map_get_bounds_array"></a>

#### mapxResolversStatic.map\_get\_bounds\_array() ⇒ <code>Array</code>
Get current map bounds as array

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Bounds [west, south, east, north]  
<a name="MapxResolversStatic+map_set_bounds_array"></a>

#### mapxResolversStatic.map\_set\_bounds\_array(opt)
Set current map bounds

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.bounds | <code>array</code> | [west, south, east, north] |

<a name="MapxResolversStatic+map_get_max_bounds_array"></a>

#### mapxResolversStatic.map\_get\_max\_bounds\_array() ⇒ <code>Array</code> \| <code>null</code>
Get current max bounds / world

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> \| <code>null</code> - bounds [west, south, east, north] or null  
<a name="MapxResolversStatic+map_set_max_bounds_array"></a>

#### mapxResolversStatic.map\_set\_max\_bounds\_array(opt) ⇒ <code>boolean</code>
Set current max bounds / world

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.bounds | <code>array</code> | [west, south, east, north] If empty or null = reset |

<a name="MapxResolversStatic+map"></a>

#### mapxResolversStatic.map(opt) ⇒ <code>Promise.&lt;(Any\|Boolean)&gt;</code>
Generic map (mapbox-gl-js) methods
This gives you low level access to the `map` methods. Most methods work, but not all.
see https://docs.mapbox.com/mapbox-gl-js/api/map for all references

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;(Any\|Boolean)&gt;</code> - If returned value can be parsed, the value. If not, true;  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.method | <code>String</code> | Method/Instance member name (ex. `setPaintProperty`); |
| opt.parameters | <code>Array</code> | Array of parameters (ex. "['background', 'background-color', '#faafee']") |

**Example**  
```js
mapx.ask('map',{
   method: 'setPaintProperty',
   parameters : ['background', 'background-color', '#faafee']
}).then(console.table);
```
<a name="MapxResolversStatic+map_wait_idle"></a>

#### mapxResolversStatic.map\_wait\_idle() ⇒ <code>Boolean</code>
Async wait for map idle

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Boolean</code> - Map is idle  
<a name="MapxResolversStatic+common_loc_get_list_codes"></a>

#### mapxResolversStatic.common\_loc\_get\_list\_codes() ⇒ <code>Array</code>
Get list of common location codes
Codes as defined in ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes (ex. m49_901)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Array</code> - Array of codes as strings  
<a name="MapxResolversStatic+common_loc_get_table_codes"></a>

#### mapxResolversStatic.common\_loc\_get\_table\_codes(opt) ⇒ <code>Promise.&lt;Array&gt;</code>
Get table of common location codes and names
Same as common_loc_get_list_codes, but with names in set language. ex. [{code:"ABW",name:"Aruba"},...]

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of codes and name as object  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.language | <code>String</code> | Language (ISO 639-1 two letters code, default 'en') |

**Example**  
```js
mapx.ask('common_loc_get_table_codes',{
   language: english
}).then(console.table);
// code  name
// -----------------
// ABW   Aruba
// AFG   Afghanistan
// AGO   Angola
// AIA   Anguilla
```
<a name="MapxResolversStatic+common_loc_get_bbox"></a>

#### mapxResolversStatic.common\_loc\_get\_bbox(o) ⇒ <code>Promise.&lt;Array&gt;</code>
Get Bounding box for code iso3, m49 and text + language

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of geographic bounds [west, south, east, north]  

| Param | Type | Description |
| --- | --- | --- |
| o | <code>Object</code> | options |
| o.code | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004' |
| o.name | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh |

<a name="MapxResolversStatic+common_loc_fit_bbox"></a>

#### mapxResolversStatic.common\_loc\_fit\_bbox(o) ⇒ <code>Promise.&lt;Array&gt;</code>
Set map bounding box based on code (ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes) or name (ex. Africa)

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Array of geographic bounds [west, south, east, north]  

| Param | Type | Description |
| --- | --- | --- |
| o | <code>Object</code> | options |
| o.code | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004' |
| o.name | <code>String</code> \| <code>Array.&lt;string&gt;</code> | Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh |
| o.param | <code>Object</code> | Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions |

<a name="MapxResolversPanels+panels_batch"></a>

#### mapxResolversStatic.panels\_batch(config) ⇒ <code>void</code>
Applies a batch state to panels based on the provided configuration.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | The configuration object that maps panel IDs to their desired state. |

**Example**  
```js
// Example usage :
mapx.ask('panels_batch',{
    "controls_panel": {
      "show": true,
      "open": true
    }
  }
});
```
<a name="MapxResolversPanels+panels_state"></a>

#### mapxResolversStatic.panels\_state() ⇒ <code>Object</code>
Retrieves current state.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Object</code> - config - The configuration object that maps panel IDs to their desired state.  
**Example**  
```js
// Example usage :
const state = await mapx.ask('panels_state');
console.log(state);
//  {
//  "controls_panel": {
//   "hide": false,
//   "open": true
//   }
//  }
```
<a name="MapxResolversPanels+panels_list"></a>

#### mapxResolversStatic.panels\_list() ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
Lists all registered panel IDs.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;Array.&lt;string&gt;&gt;</code> - A promise that resolves to an array of panel IDs.  
**Example**  
```js
const panelIds = await mapx.ask('panels_list');
console.log(panelIds);  // Outputs: ['panel_1', 'panel_2', ...]
```
<a name="MapxResolversPanels+panels_close_all"></a>

#### mapxResolversStatic.panels\_close\_all() ⇒ <code>void</code>
Closes all registered panels.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversPanels+panels_open_all"></a>

#### mapxResolversStatic.panels\_open\_all() ⇒ <code>void</code>
Opens all registered panels.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversPanels+panels_hide_all"></a>

#### mapxResolversStatic.panels\_hide\_all() ⇒ <code>void</code>
Hides all registered panels.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversPanels+panels_show_all"></a>

#### mapxResolversStatic.panels\_show\_all() ⇒ <code>void</code>
Shows all registered panels.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
<a name="MapxResolversPanels+panels_is_open"></a>

#### mapxResolversStatic.panels\_is\_open(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is open.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is open, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_closed"></a>

#### mapxResolversStatic.panels\_is\_closed(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is closed.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is closed, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_visible"></a>

#### mapxResolversStatic.panels\_is\_visible(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is visible.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is visible, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |

<a name="MapxResolversPanels+panels_is_hidden"></a>

#### mapxResolversStatic.panels\_is\_hidden(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Checks if a panel is hidden.

**Kind**: instance method of [<code>MapxResolversStatic</code>](#MapxResolversStatic)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - True if the panel is hidden, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The panel ID. |


* * *


&copy; 2019-present unepgrid.ch
