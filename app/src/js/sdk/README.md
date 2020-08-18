
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

### HTML inline include

```
<script src="https://unpkg.com/@fxi/mxsdk/dist/mxsdk.umd.js"></script>
...
const Manager = mxsdk.Manager;
```

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
  mapx.ask('view_add', {idView: 'MX-ML9PZ-PZ1SI-WVV85'});

  // Etc, ...

});
```

### Methods

[Methods are handled by the MapxResolvers class](#MapxResolvers) and are call using `Manager.ask(<method name>[, <object param(s)>])` which returns a Promise or a Promisified value.

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
- highlight_progress
- highlight_update
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
- [SDK Recipies](https://github.com/unep-grid/map-x-mgl/wiki/SDK---Recipes)

## Documentation

### Classes

<dl>
<dt><a href="#Events">Events</a></dt>
<dd><p>Simple event management</p>
</dd>
<dt><a href="#FrameManager">FrameManager</a> ⇐ <code><a href="#Events">Events</a></code></dt>
<dd><p>Class to create a manager to build an iframe and post message to a worker inside</p>
</dd>
<dt><a href="#FrameWorker">FrameWorker</a> ⇐ <code><a href="#Events">Events</a></code></dt>
<dd><p>Class to create a worker / listener inside an application</p>
</dd>
<dt><a href="#Manager">Manager</a></dt>
<dd><p>Class to wrap frame manager with custom options</p>
</dd>
<dt><a href="#Worker">Worker</a></dt>
<dd><p>Class to wrap frame worker with custom options</p>
</dd>
<dt><a href="#MapxResolvers">MapxResolvers</a></dt>
<dd><p>Class to handle MapX specific method</p>
</dd>
</dl>

<a name="Events"></a>

### Events
Simple event management

**Kind**: global class  

* [Events](#Events)
    * [new Events()](#new_Events_new)
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)

<a name="new_Events_new"></a>

#### new Events()
new Event handler

**Example**  
```js
var e = new Events();
    e.on('test',()=>{console.log('ok')});
    e.fire('test') -> 'ok'
```
<a name="Events+fire"></a>

#### events.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

#### events.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

#### events.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

#### events.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="FrameManager"></a>

### FrameManager ⇐ [<code>Events</code>](#Events)
Class to create a manager to build an iframe and post message to a worker inside

**Kind**: global class  
**Extends**: [<code>Events</code>](#Events)  

* [FrameManager](#FrameManager) ⇐ [<code>Events</code>](#Events)
    * [new FrameManager(opt)](#new_FrameManager_new)
    * [.rect](#FrameManager+rect)
    * [.width](#FrameManager+width)
    * [.height](#FrameManager+height)
    * [.url](#FrameManager+url) ⇒
    * [.destroy()](#FrameManager+destroy)
    * [.setUrl(Url)](#FrameManager+setUrl)
    * [.setLang(Two)](#FrameManager+setLang)
    * [.ask(Id, data)](#FrameManager+ask) ⇒ <code>Promise</code>
    * [._getAndRemoveRequestById(id)](#FrameManager+_getAndRemoveRequestById) ⇒ <code>RequestFrameCom</code>
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)

<a name="new_FrameManager_new"></a>

#### new FrameManager(opt)
Create a manager


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options SEE settings.json |
| opt.url | <code>String</code> | Url of the worker |
| opt.style | <code>Object</code> | Style css object |
| opt.container | <code>Element</code> | Element that will hold the worker iframe |

<a name="FrameManager+rect"></a>

#### frameManager.rect
Get bounding client rect of the iframe

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  
<a name="FrameManager+width"></a>

#### frameManager.width
Set iframe width

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| w | <code>number</code> \| <code>string</code> | Width in px |

<a name="FrameManager+height"></a>

#### frameManager.height
Set iframe height

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| h | <code>number</code> \| <code>string</code> | height in px |

<a name="FrameManager+url"></a>

#### frameManager.url ⇒
get url

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  
**Returns**: url object  
<a name="FrameManager+destroy"></a>

#### frameManager.destroy()
Destroy manager

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
<a name="FrameManager+setUrl"></a>

#### frameManager.setUrl(Url)
Set url

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| Url | <code>string</code> \| <code>url</code> | to use when rendering |

<a name="FrameManager+setLang"></a>

#### frameManager.setLang(Two)
Set message languages

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| Two | <code>String</code> | letter string language. e.g. 'en', 'fr' |

<a name="FrameManager+ask"></a>

#### frameManager.ask(Id, data) ⇒ <code>Promise</code>
const id = request.id;
Ask / request method to the worker

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Returns**: <code>Promise</code> - Promise that resolve to the resolver result  

| Param | Type | Description |
| --- | --- | --- |
| Id | <code>String</code> | of the request/resolver |
| data | <code>String</code> | Optional data to send to the resolver |

<a name="FrameManager+_getAndRemoveRequestById"></a>

#### frameManager.\_getAndRemoveRequestById(id) ⇒ <code>RequestFrameCom</code>
Retrieve request by id and remove it

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>Number</code> | Id of the request |

<a name="Events+fire"></a>

#### frameManager.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>fire</code>](#Events+fire)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

#### frameManager.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>on</code>](#Events+on)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

#### frameManager.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>off</code>](#Events+off)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

#### frameManager.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>once</code>](#Events+once)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="FrameWorker"></a>

### FrameWorker ⇐ [<code>Events</code>](#Events)
Class to create a worker / listener inside an application

**Kind**: global class  
**Extends**: [<code>Events</code>](#Events)  

* [FrameWorker](#FrameWorker) ⇐ [<code>Events</code>](#Events)
    * [new FrameWorker(opt)](#new_FrameWorker_new)
    * [.isNested()](#FrameWorker+isNested) ⇒ <code>Boolean</code>
    * [.destroy()](#FrameWorker+destroy)
    * [.removeListener()](#FrameWorker+removeListener)
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)

<a name="new_FrameWorker_new"></a>

#### new FrameWorker(opt)
create a worke


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.resolvers | <code>Resolver</code> | Resolver |
| opt.eventStore | <code>EventStore</code> | EventStore |

<a name="FrameWorker+isNested"></a>

#### frameWorker.isNested() ⇒ <code>Boolean</code>
Check if the worker has a parent (is nested)

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Returns**: <code>Boolean</code> - true if the worker has a parent (is inside an iframe)  
<a name="FrameWorker+destroy"></a>

#### frameWorker.destroy()
Destroy the worker

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
<a name="FrameWorker+removeListener"></a>

#### frameWorker.removeListener()
Remove message listener

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
<a name="Events+fire"></a>

#### frameWorker.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>fire</code>](#Events+fire)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

#### frameWorker.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>on</code>](#Events+on)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

#### frameWorker.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>off</code>](#Events+off)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

#### frameWorker.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>once</code>](#Events+once)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Manager"></a>

### Manager
Class to wrap frame manager with custom options

**Kind**: global class  
<a name="new_Manager_new"></a>

#### new Manager(opt)
Create new manager with custom options


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |

<a name="Worker"></a>

### Worker
Class to wrap frame worker with custom options

**Kind**: global class  
<a name="new_Worker_new"></a>

#### new Worker(opt)
Create new worker with custom options


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |

<a name="MapxResolvers"></a>

### MapxResolvers
Class to handle MapX specific method

**Kind**: global class  

* [MapxResolvers](#MapxResolvers)
    * [.set_panel_left_visibility(opt)](#MapxResolvers+set_panel_left_visibility) ⇒ <code>Boolean</code>
    * [.set_immersive_mode()](#MapxResolvers+set_immersive_mode) ⇒ <code>Boolean</code>
    * [.get_immersive_mode()](#MapxResolvers+get_immersive_mode) ⇒ <code>Boolean</code>
    * [.set_theme(opt)](#MapxResolvers+set_theme) ⇒ <code>Boolean</code>
    * [.get_themes_id()](#MapxResolvers+get_themes_id) ⇒ <code>Array</code>
    * [.get_themes()](#MapxResolvers+get_themes) ⇒ <code>Object</code>
    * [.get_theme_id()](#MapxResolvers+get_theme_id) ⇒ <code>string</code>
    * [.has_el_id(opt)](#MapxResolvers+has_el_id)
    * [.set_dashboard_visibility(opt)](#MapxResolvers+set_dashboard_visibility) ⇒ <code>Boolean</code>
    * [.is_dashboard_visible()](#MapxResolvers+is_dashboard_visible) ⇒ <code>Boolean</code>
    * [.get_source_meta(opt)](#MapxResolvers+get_source_meta) ⇒ <code>Object</code>
    * [.get_user_id()](#MapxResolvers+get_user_id) ⇒ <code>Number</code>
    * [.get_user_ip()](#MapxResolvers+get_user_ip) ⇒ <code>Object</code>
    * [.get_user_roles()](#MapxResolvers+get_user_roles) ⇒ <code>Object</code>
    * [.check_user_role(opt)](#MapxResolvers+check_user_role) ⇒ <code>Boolean</code>
    * [.get_user_email()](#MapxResolvers+get_user_email) ⇒ <code>String</code>
    * [.set_project(opt)](#MapxResolvers+set_project) ⇒ <code>Boolean</code>
    * [.get_language()](#MapxResolvers+get_language) ⇒ <code>String</code>
    * [.set_language(opt)](#MapxResolvers+set_language) ⇒ <code>Boolean</code>
    * [.get_languages()](#MapxResolvers+get_languages) ⇒ <code>Array</code>
    * [.get_projects(opt)](#MapxResolvers+get_projects) ⇒ <code>Array</code>
    * [.get_project()](#MapxResolvers+get_project) ⇒ <code>String</code>
    * [.get_project_collections(opt)](#MapxResolvers+get_project_collections) ⇒ <code>Array</code>
    * [.is_user_guest()](#MapxResolvers+is_user_guest) ⇒ <code>Boolean</code>
    * [.get_views()](#MapxResolvers+get_views) ⇒ <code>Array</code>
    * [.get_views_with_visible_layer()](#MapxResolvers+get_views_with_visible_layer) ⇒ <code>Array</code>
    * [.get_views_id()](#MapxResolvers+get_views_id) ⇒ <code>Array</code>
    * [.get_views_id_open()](#MapxResolvers+get_views_id_open) ⇒ <code>Array</code>
    * [.get_view_meta_vt_attribute(opt)](#MapxResolvers+get_view_meta_vt_attribute) ⇒ <code>Object</code>
    * [.get_view_meta(opt, view)](#MapxResolvers+get_view_meta) ⇒ <code>Object</code>
    * [.get_view_table_attribute_config(opt)](#MapxResolvers+get_view_table_attribute_config) ⇒ <code>Object</code>
    * [.get_view_table_attribute_url(opt)](#MapxResolvers+get_view_table_attribute_url) ⇒ <code>String</code>
    * [.get_view_table_attribute(opt)](#MapxResolvers+get_view_table_attribute) ⇒ <code>Object</code>
    * [.get_view_legend_image(opt)](#MapxResolvers+get_view_legend_image) ⇒ <code>String</code>
    * [.set_view_layer_filter_text(opt)](#MapxResolvers+set_view_layer_filter_text) ⇒ <code>Boolean</code>
    * [.get_view_layer_filter_text(opt)](#MapxResolvers+get_view_layer_filter_text) ⇒ <code>Boolean</code>
    * [.set_view_layer_filter_numeric(opt)](#MapxResolvers+set_view_layer_filter_numeric)
    * [.set_view_layer_filter_time(opt)](#MapxResolvers+set_view_layer_filter_time) ⇒
    * [.set_view_layer_transparency(opt)](#MapxResolvers+set_view_layer_transparency) ⇒
    * [.get_view_layer_filter_numeric(opt)](#MapxResolvers+get_view_layer_filter_numeric) ⇒ <code>Number</code> \| <code>Array</code>
    * [.get_view_layer_filter_time(opt)](#MapxResolvers+get_view_layer_filter_time) ⇒ <code>Number</code> \| <code>Array</code>
    * [.get_view_layer_transparency(opt)](#MapxResolvers+get_view_layer_transparency) ⇒ <code>Number</code>
    * [.view_add(opt)](#MapxResolvers+view_add) ⇒ <code>Boolean</code>
    * [.view_remove(opt)](#MapxResolvers+view_remove) ⇒ <code>Boolean</code>
    * [.download_view_source_raster(opt)](#MapxResolvers+download_view_source_raster) ⇒ <code>Object</code>
    * [.download_view_source_vector(opt)](#MapxResolvers+download_view_source_vector) ⇒ <code>Object</code>
    * [.download_view_source_geojson(opt)](#MapxResolvers+download_view_source_geojson) ⇒ <code>Object</code>
    * [.show_modal_login()](#MapxResolvers+show_modal_login) ⇒ <code>Boolean</code>
    * [.show_modal_view_meta()](#MapxResolvers+show_modal_view_meta) ⇒ <code>Boolean</code>
    * [.show_modal_view_edit()](#MapxResolvers+show_modal_view_edit) ⇒ <code>Boolean</code>
    * [.show_modal_map_composer()](#MapxResolvers+show_modal_map_composer) ⇒ <code>Boolean</code>
    * [.show_modal_share(opt)](#MapxResolvers+show_modal_share) ⇒ <code>Boolean</code>
    * [.show_modal_tool(opt)](#MapxResolvers+show_modal_tool) ⇒ <code>Boolean</code> \| <code>Array</code>
    * [.close_modal_all()](#MapxResolvers+close_modal_all) ⇒ <code>Boolean</code>
    * [.toggle_draw_mode()](#MapxResolvers+toggle_draw_mode)
    * [.get_views_order()](#MapxResolvers+get_views_order) ⇒ <code>Array</code>
    * [.get_views_list_state()](#MapxResolvers+get_views_list_state) ⇒ <code>Array</code>
    * [.set_views_list_filters(opt)](#MapxResolvers+set_views_list_filters) ⇒ <code>Boolean</code>
    * [.get_views_list_filters()](#MapxResolvers+get_views_list_filters) ⇒ <code>Array</code>
    * [.get_views_title(opt)](#MapxResolvers+get_views_title) ⇒ <code>Array</code>
    * [.set_views_list_state(opt)](#MapxResolvers+set_views_list_state) ⇒ <code>Boolean</code>
    * [.set_views_list_sort(opt)](#MapxResolvers+set_views_list_sort) ⇒ <code>Boolean</code>
    * [.move_view_top(opt)](#MapxResolvers+move_view_top) ⇒ <code>Boolean</code>
    * [.move_view_bottom(opt)](#MapxResolvers+move_view_bottom) ⇒ <code>Boolean</code>
    * [.move_view_after(opt)](#MapxResolvers+move_view_after) ⇒ <code>Boolean</code>
    * [.move_view_before(opt)](#MapxResolvers+move_view_before) ⇒ <code>Boolean</code>
    * [.move_view_up(opt)](#MapxResolvers+move_view_up) ⇒ <code>Boolean</code>
    * [.move_view_down(opt)](#MapxResolvers+move_view_down) ⇒ <code>Boolean</code>
    * [.set_vector_highlight(opt)](#MapxResolvers+set_vector_highlight) ⇒ <code>Object</code>
    * [.view_geojson_create(opt)](#MapxResolvers+view_geojson_create) ⇒ <code>Object</code>
    * [.view_geojson_set_style(opt)](#MapxResolvers+view_geojson_set_style) ⇒ <code>Boolean</code>
    * [.view_geojson_delete(opt)](#MapxResolvers+view_geojson_delete) ⇒ <code>Boolean</code>
    * [.set_features_click_sdk_only(opt)](#MapxResolvers+set_features_click_sdk_only) ⇒ <code>Array</code>
    * [.get_features_click_handlers()](#MapxResolvers+get_features_click_handlers) ⇒ <code>Array</code>
    * [.map_fly_to(opt)](#MapxResolvers+map_fly_to) ⇒ <code>Boolean</code>
    * [.map_jump_to(opt)](#MapxResolvers+map_jump_to) ⇒ <code>Boolean</code>
    * [.map_get_zoom()](#MapxResolvers+map_get_zoom) ⇒ <code>Float</code>
    * [.map_get_center()](#MapxResolvers+map_get_center) ⇒ <code>Array</code>
    * [.get_sdk_methods()](#MapxResolvers+get_sdk_methods) ⇒ <code>Array</code>

<a name="MapxResolvers+set_panel_left_visibility"></a>

#### mapxResolvers.set\_panel\_left\_visibility(opt) ⇒ <code>Boolean</code>
Set panel visibility

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.panel | <code>String</code> | Name of the panel (views, tools) |
| opt.show | <code>Boolean</code> | If true, show the panel (and hide other) |
| opt.toggle | <code>Boolean</code> | Toggle the panel |

<a name="MapxResolvers+set_immersive_mode"></a>

#### mapxResolvers.set\_immersive\_mode() ⇒ <code>Boolean</code>
Toogle immersive mode

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - enabled  
**Aram**: <code>Object</code> opt Options  

| Param | Type | Description |
| --- | --- | --- |
| opt.enable | <code>Boolean</code> | Force enable |
| opt.toggle | <code>Boolean</code> | Toggle |

<a name="MapxResolvers+get_immersive_mode"></a>

#### mapxResolvers.get\_immersive\_mode() ⇒ <code>Boolean</code>
Get immersive mode state

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Enabled  
<a name="MapxResolvers+set_theme"></a>

#### mapxResolvers.set\_theme(opt) ⇒ <code>Boolean</code>
Set MapX theme by id or set custom colors.
Both ways are exclusive.

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idTheme | <code>String</code> | Valid theme id. Use 'get_themes_id' to get a list |
| opt.colors | <code>Object</code> | Valid colors scheme. Use 'get_themes' to see default themes structure. |

<a name="MapxResolvers+get_themes_id"></a>

#### mapxResolvers.get\_themes\_id() ⇒ <code>Array</code>
Get themes id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - array of themes id  
<a name="MapxResolvers+get_themes"></a>

#### mapxResolvers.get\_themes() ⇒ <code>Object</code>
Get all themes

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Themes object with themes id as key  
<a name="MapxResolvers+get_theme_id"></a>

#### mapxResolvers.get\_theme\_id() ⇒ <code>string</code>
Get current theme id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>string</code> - Theme id  
<a name="MapxResolvers+has_el_id"></a>

#### mapxResolvers.has\_el\_id(opt)
Check if element is visible, by id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.id | <code>String</code> | Id of the element to check |
| opt.timeout | <code>Number</code> | Timeout |

<a name="MapxResolvers+set_dashboard_visibility"></a>

#### mapxResolvers.set\_dashboard\_visibility(opt) ⇒ <code>Boolean</code>
Set dashboard visibility

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.show | <code>Boolean</code> | If true, show the dashboard |
| opt.toggle | <code>Boolean</code> | Toggle the dashoard |

<a name="MapxResolvers+is_dashboard_visible"></a>

#### mapxResolvers.is\_dashboard\_visible() ⇒ <code>Boolean</code>
Check if the dashboard is visible

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - The dashboard is visible  
<a name="MapxResolvers+get_source_meta"></a>

#### mapxResolvers.get\_source\_meta(opt) ⇒ <code>Object</code>
Get source metadata

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Source MapX metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idSource | <code>String</code> | Id of the source |

<a name="MapxResolvers+get_user_id"></a>

#### mapxResolvers.get\_user\_id() ⇒ <code>Number</code>
Get user id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> - Current user id  
<a name="MapxResolvers+get_user_ip"></a>

#### mapxResolvers.get\_user\_ip() ⇒ <code>Object</code>
Get user ip info

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Current user ip object (ip, country, region, etc)  
<a name="MapxResolvers+get_user_roles"></a>

#### mapxResolvers.get\_user\_roles() ⇒ <code>Object</code>
Get user roles

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Current user roles  
<a name="MapxResolvers+check_user_role"></a>

#### mapxResolvers.check\_user\_role(opt) ⇒ <code>Boolean</code>
Check if user as given role

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - has role(s)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.role | <code>String</code> \| <code>Array</code> | Role(s) to check |
| opt.all | <code>Boolean</code> | all roles must match, else at least one |

<a name="MapxResolvers+get_user_email"></a>

#### mapxResolvers.get\_user\_email() ⇒ <code>String</code>
Get user email

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Current user email ( if logged, null if not)  
<a name="MapxResolvers+set_project"></a>

#### mapxResolvers.set\_project(opt) ⇒ <code>Boolean</code>
Set project

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idProject | <code>String</code> | Id of the project to switch to |

<a name="MapxResolvers+get_language"></a>

#### mapxResolvers.get\_language() ⇒ <code>String</code>
Get current language

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Two letters language code  
<a name="MapxResolvers+set_language"></a>

#### mapxResolvers.set\_language(opt) ⇒ <code>Boolean</code>
Setlanguage

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Laguage change process finished  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.lang | <code>String</code> | Two letters language code |

<a name="MapxResolvers+get_languages"></a>

#### mapxResolvers.get\_languages() ⇒ <code>Array</code>
Get list of supported current languages

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of two letters language code  
<a name="MapxResolvers+get_projects"></a>

#### mapxResolvers.get\_projects(opt) ⇒ <code>Array</code>
Get projects list

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - list of project for the current user, using optional filters  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Project fetching option |

<a name="MapxResolvers+get_project"></a>

#### mapxResolvers.get\_project() ⇒ <code>String</code>
Get current project id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Current project id  
<a name="MapxResolvers+get_project_collections"></a>

#### mapxResolvers.get\_project\_collections(opt) ⇒ <code>Array</code>
Get list of collection for the current project

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of collections names  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.open | <code>Boolean</code> | Return only collections from open views |

<a name="MapxResolvers+is_user_guest"></a>

#### mapxResolvers.is\_user\_guest() ⇒ <code>Boolean</code>
Test if the current user is guest

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - User is guest  
<a name="MapxResolvers+get_views"></a>

#### mapxResolvers.get\_views() ⇒ <code>Array</code>
Get list of available views as static objects

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolvers+get_views_with_visible_layer"></a>

#### mapxResolvers.get\_views\_with\_visible\_layer() ⇒ <code>Array</code>
Get list views with visible layers

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolvers+get_views_id"></a>

#### mapxResolvers.get\_views\_id() ⇒ <code>Array</code>
Get list of available views id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolvers+get_views_id_open"></a>

#### mapxResolvers.get\_views\_id\_open() ⇒ <code>Array</code>
Get list of available views id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolvers+get_view_meta_vt_attribute"></a>

#### mapxResolvers.get\_view\_meta\_vt\_attribute(opt) ⇒ <code>Object</code>
Get vector view (vt) metadata of the attribute

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - attribut metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolvers+get_view_meta"></a>

#### mapxResolvers.get\_view\_meta(opt, view) ⇒ <code>Object</code>
Get view metadata

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - view metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| view | <code>Object</code> | meta data object |

<a name="MapxResolvers+get_view_table_attribute_config"></a>

#### mapxResolvers.get\_view\_table\_attribute\_config(opt) ⇒ <code>Object</code>
Get view table attribute config

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolvers+get_view_table_attribute_url"></a>

#### mapxResolvers.get\_view\_table\_attribute\_url(opt) ⇒ <code>String</code>
Get view table attribute url

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolvers+get_view_table_attribute"></a>

#### mapxResolvers.get\_view\_table\_attribute(opt) ⇒ <code>Object</code>
Get view table attribute

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolvers+get_view_legend_image"></a>

#### mapxResolvers.get\_view\_legend\_image(opt) ⇒ <code>String</code>
Get view legend

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - PNG in base64 format  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| opt.format | <code>String</code> |  |

<a name="MapxResolvers+set_view_layer_filter_text"></a>

#### mapxResolvers.set\_view\_layer\_filter\_text(opt) ⇒ <code>Boolean</code>
Filter view layer by text (if attribute is text)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |

<a name="MapxResolvers+get_view_layer_filter_text"></a>

#### mapxResolvers.get\_view\_layer\_filter\_text(opt) ⇒ <code>Boolean</code>
Get current search box item

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |

<a name="MapxResolvers+set_view_layer_filter_numeric"></a>

#### mapxResolvers.set\_view\_layer\_filter\_numeric(opt)
Filter view layer by numeric (if attribute is numeric)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolvers+set_view_layer_filter_time"></a>

#### mapxResolvers.set\_view\_layer\_filter\_time(opt) ⇒
Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: null  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> \| <code>Array</code> | Value or range of value |

<a name="MapxResolvers+set_view_layer_transparency"></a>

#### mapxResolvers.set\_view\_layer\_transparency(opt) ⇒
Set layer transarency (0 : visible, 100 : 100% transparent)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: null  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolvers+get_view_layer_filter_numeric"></a>

#### mapxResolvers.get\_view\_layer\_filter\_numeric(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current numeric slider value

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+get_view_layer_filter_time"></a>

#### mapxResolvers.get\_view\_layer\_filter\_time(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current time slider value

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+get_view_layer_transparency"></a>

#### mapxResolvers.get\_view\_layer\_transparency(opt) ⇒ <code>Number</code>
Get current transparency value for layers of a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> - value  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+view_add"></a>

#### mapxResolvers.view\_add(opt) ⇒ <code>Boolean</code>
Add a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+view_remove"></a>

#### mapxResolvers.view\_remove(opt) ⇒ <code>Boolean</code>
remove a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+download_view_source_raster"></a>

#### mapxResolvers.download\_view\_source\_raster(opt) ⇒ <code>Object</code>
Get the download link of the raster source

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - input options, with new key : url. E.g. {idView:<abc>,url:<url>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Raster view id |

<a name="MapxResolvers+download_view_source_vector"></a>

#### mapxResolvers.download\_view\_source\_vector(opt) ⇒ <code>Object</code>
Open the download modal for vector views

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Vector view id |

<a name="MapxResolvers+download_view_source_geojson"></a>

#### mapxResolvers.download\_view\_source\_geojson(opt) ⇒ <code>Object</code>
Get the data from geojson view or download geojsn as a file

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - input options E.g. {idView:<abc>, data:<data (if mode = data)>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | GeoJSON view id |
| opt.mode | <code>String</code> | "file" or "data" |

<a name="MapxResolvers+show_modal_login"></a>

#### mapxResolvers.show\_modal\_login() ⇒ <code>Boolean</code>
Show the login modal window

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+show_modal_view_meta"></a>

#### mapxResolvers.show\_modal\_view\_meta() ⇒ <code>Boolean</code>
Show view meta modal window

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+show_modal_view_edit"></a>

#### mapxResolvers.show\_modal\_view\_edit() ⇒ <code>Boolean</code>
Show view edit modal window

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+show_modal_map_composer"></a>

#### mapxResolvers.show\_modal\_map\_composer() ⇒ <code>Boolean</code>
Show map composer

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+show_modal_share"></a>

#### mapxResolvers.show\_modal\_share(opt) ⇒ <code>Boolean</code>
Show sharing modal window

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id view to share |

<a name="MapxResolvers+show_modal_tool"></a>

#### mapxResolvers.show\_modal\_tool(opt) ⇒ <code>Boolean</code> \| <code>Array</code>
Show modal for tools

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> \| <code>Array</code> - Done or the list of tools  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.tool | <code>String</code> | Id of the tools |
| opt.list | <code>Boolean</code> | Return a list of tools |

<a name="MapxResolvers+close_modal_all"></a>

#### mapxResolvers.close\_modal\_all() ⇒ <code>Boolean</code>
close all modal windows

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+toggle_draw_mode"></a>

#### mapxResolvers.toggle\_draw\_mode()
Toggle draw mode

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
<a name="MapxResolvers+get_views_order"></a>

#### mapxResolvers.get\_views\_order() ⇒ <code>Array</code>
Get views current absolute order (without groups)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
<a name="MapxResolvers+get_views_list_state"></a>

#### mapxResolvers.get\_views\_list\_state() ⇒ <code>Array</code>
Get views list state

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
<a name="MapxResolvers+set_views_list_filters"></a>

#### mapxResolvers.set\_views\_list\_filters(opt) ⇒ <code>Boolean</code>
Set views list filter (ui)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
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
<a name="MapxResolvers+get_views_list_filters"></a>

#### mapxResolvers.get\_views\_list\_filters() ⇒ <code>Array</code>
Get views list filter rules

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Rule list  
<a name="MapxResolvers+get_views_title"></a>

#### mapxResolvers.get\_views\_title(opt) ⇒ <code>Array</code>
Get list of views title

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of titles (string)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.views | <code>Array</code> | List of views or views id |

<a name="MapxResolvers+set_views_list_state"></a>

#### mapxResolvers.set\_views\_list\_state(opt) ⇒ <code>Boolean</code>
Set state / views list order, groups, etc. Opened view will be closed

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.state | <code>Array</code> | Mapx views list state |

<a name="MapxResolvers+set_views_list_sort"></a>

#### mapxResolvers.set\_views\_list\_sort(opt) ⇒ <code>Boolean</code>
Set views list order

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.asc | <code>Boolean</code> | Asc |
| opt.mode | <code>String</code> | Mode : 'string' or 'date'; |

<a name="MapxResolvers+move_view_top"></a>

#### mapxResolvers.move\_view\_top(opt) ⇒ <code>Boolean</code>
Move view on top of its group

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolvers+move_view_bottom"></a>

#### mapxResolvers.move\_view\_bottom(opt) ⇒ <code>Boolean</code>
Move view on the bottom of its group

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolvers+move_view_after"></a>

#### mapxResolvers.move\_view\_after(opt) ⇒ <code>Boolean</code>
Move view after anoter view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |
| opt.idViewAfter | <code>Sring</code> |  |

<a name="MapxResolvers+move_view_before"></a>

#### mapxResolvers.move\_view\_before(opt) ⇒ <code>Boolean</code>
Move view before another view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |
| opt.idViewBefore | <code>Sring</code> |  |

<a name="MapxResolvers+move_view_up"></a>

#### mapxResolvers.move\_view\_up(opt) ⇒ <code>Boolean</code>
Move view up

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolvers+move_view_down"></a>

#### mapxResolvers.move\_view\_down(opt) ⇒ <code>Boolean</code>
Move view down

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>Sring</code> |  |

<a name="MapxResolvers+set_vector_highlight"></a>

#### mapxResolvers.set\_vector\_highlight(opt) ⇒ <code>Object</code>
Highlight vector feature : Enable, disable, toggle

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - options realised {enable:<false/true>,calcArea:<true/false>,nLayers:<n>}  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable or disable. If not set, toggle highglight |
| opt.nLayers | <code>Number</code> | Numbers of layer that are used in the overlap tool. If not set, the default is 1 : any visible feature is highlighted. If 0 = only part where all displayed layers are overlapping are highligthed |
| opt.calcArea | <code>Boolean</code> | Estimate area covered by visible feature and display result in MapX interface |

<a name="MapxResolvers+view_geojson_create"></a>

#### mapxResolvers.view\_geojson\_create(opt) ⇒ <code>Object</code>
Add geojson.
( Other supported file type may be supported )

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
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

<a name="MapxResolvers+view_geojson_set_style"></a>

#### mapxResolvers.view\_geojson\_set\_style(opt) ⇒ <code>Boolean</code>
Set geojson view layers style : layout and paint

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view |
| opt.layout | <code>Object</code> | Mapbox-gl layout object e.g. {'visibility','none'}; |
| opt.paint | <code>Object</code> | Mapbox-gl paint object. e.g. {'fill-color':'red'}; |

<a name="MapxResolvers+view_geojson_delete"></a>

#### mapxResolvers.view\_geojson\_delete(opt) ⇒ <code>Boolean</code>
Delete view geojson
Works with all view, but not permanently.

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the geojson view to delete. |

<a name="MapxResolvers+set_features_click_sdk_only"></a>

#### mapxResolvers.set\_features\_click\_sdk\_only(opt) ⇒ <code>Array</code>
Set map feature click handler to sdk only
A listener could be set to listen to 'click_attributes' events. e.g. mapx.on('click_attributes')
if this option is enabled, only the SDK will receive the attribute table.

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Enabled modes  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.enable | <code>Boolean</code> | Enable sdk only |
| opt.toggle | <code>Boolean</code> | Toggle this mode |

<a name="MapxResolvers+get_features_click_handlers"></a>

#### mapxResolvers.get\_features\_click\_handlers() ⇒ <code>Array</code>
Get map feature click handlers id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Enabled modes  
<a name="MapxResolvers+map_fly_to"></a>

#### mapxResolvers.map\_fly\_to(opt) ⇒ <code>Boolean</code>
Map flyTo position with flying animation

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Move ended  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto |

**Example**  
```js
mapx.ask('map_fly_to',{center:[46,23], zoom:5});
```
<a name="MapxResolvers+map_jump_to"></a>

#### mapxResolvers.map\_jump\_to(opt) ⇒ <code>Boolean</code>
Map jumpTo position, without animation

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - Move ended  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#jumpto |

**Example**  
```js
mapx.ask('set_map_jump_to',{lat:46,lng:23, zoom:5});
```
<a name="MapxResolvers+map_get_zoom"></a>

#### mapxResolvers.map\_get\_zoom() ⇒ <code>Float</code>
Get current map zoom

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Float</code> - zoom  
<a name="MapxResolvers+map_get_center"></a>

#### mapxResolvers.map\_get\_center() ⇒ <code>Array</code>
Get current map center

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - center  
<a name="MapxResolvers+get_sdk_methods"></a>

#### mapxResolvers.get\_sdk\_methods() ⇒ <code>Array</code>
List resolvers methods

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - array of supported methods  

* * *


&copy; 2019-2020 unepgrid.ch
