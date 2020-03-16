
## MapX SDK

The package `MxSdk` ease the integration of MapX. It features a simple way to interact with MapX within a static web page or from a full featured application.

## Example

```js
import {MxSdk} from  'mxsdk';

/**
* new instance
*/
const mapx = new MxSdk.manager({
  host : 'http://dev.mapx.localhost/'
  port : '8880',
  project : 'MX-HPP-OWB-3SI-3FF-Q3R'
  language : 'en'
});

/**
* When ready, begin requests
*/
mapx.on('ready', () => {
   /**
   * Get list of views, print them in console
   */
   mapx.ask('get_views').then(console.log);
  /**
   * Get geo ip info,  print it in console
   */
   mapx.ask('get_ip').then(console.log);
   setTimeout(()=>{
     /**
     * Change project after 3000 ms, print new list 
     * of views
     */
     mapx.ask('set_project','MX-JZL-FJV-RLN-7OH-QLU');
     .then(mapx.ask('get_views'))
     .then(console.log)

   }, 3000);
});

```


## Classes

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

## Functions

<dl>
<dt><a href="#_apply_filter_layer_slider">_apply_filter_layer_slider()</a></dt>
<dd><p>Helpers</p>
</dd>
</dl>

<a name="Events"></a>

## Events
Simple event management

**Kind**: global class  

* [Events](#Events)
    * [new Events()](#new_Events_new)
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)

<a name="new_Events_new"></a>

### new Events()
new Event handler

**Example**  
```js
var e = new Events();
    e.on('test',()=>{console.log('ok')});
    e.fire('test') -> 'ok'
```
<a name="Events+fire"></a>

### events.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

### events.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

### events.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

### events.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="FrameManager"></a>

## FrameManager ⇐ [<code>Events</code>](#Events)
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

### new FrameManager(opt)
Create a manager


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options SEE settings.json |
| opt.url | <code>String</code> | Url of the worker |
| opt.style | <code>Object</code> | Style css object |
| opt.container | <code>Element</code> | Element that will hold the worker iframe |

<a name="FrameManager+rect"></a>

### frameManager.rect
Get bounding client rect of the iframe

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  
<a name="FrameManager+width"></a>

### frameManager.width
Set iframe width

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| w | <code>number</code> \| <code>string</code> | Width in px |

<a name="FrameManager+height"></a>

### frameManager.height
Set iframe height

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| h | <code>number</code> \| <code>string</code> | height in px |

<a name="FrameManager+url"></a>

### frameManager.url ⇒
get url

**Kind**: instance property of [<code>FrameManager</code>](#FrameManager)  
**Returns**: url object  
<a name="FrameManager+destroy"></a>

### frameManager.destroy()
Destroy manager

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
<a name="FrameManager+setUrl"></a>

### frameManager.setUrl(Url)
Set url

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| Url | <code>string</code> \| <code>url</code> | to use when rendering |

<a name="FrameManager+setLang"></a>

### frameManager.setLang(Two)
Set message languages

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| Two | <code>String</code> | letter string language. e.g. 'en', 'fr' |

<a name="FrameManager+ask"></a>

### frameManager.ask(Id, data) ⇒ <code>Promise</code>
const id = request.id;
Ask / request method to the worker

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Returns**: <code>Promise</code> - Promise that resolve to the resolver result  

| Param | Type | Description |
| --- | --- | --- |
| Id | <code>String</code> | of the request/resolver |
| data | <code>String</code> | Optional data to send to the resolver |

<a name="FrameManager+_getAndRemoveRequestById"></a>

### frameManager.\_getAndRemoveRequestById(id) ⇒ <code>RequestFrameCom</code>
Retrieve request by id and remove it

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>Number</code> | Id of the request |

<a name="Events+fire"></a>

### frameManager.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>fire</code>](#Events+fire)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

### frameManager.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>on</code>](#Events+on)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

### frameManager.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>off</code>](#Events+off)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

### frameManager.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>once</code>](#Events+once)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="FrameWorker"></a>

## FrameWorker ⇐ [<code>Events</code>](#Events)
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

### new FrameWorker(opt)
create a worke


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.resolvers | <code>Resolver</code> | Resolver |
| opt.eventStore | <code>EventStore</code> | EventStore |

<a name="FrameWorker+isNested"></a>

### frameWorker.isNested() ⇒ <code>Boolean</code>
Check if the worker has a parent (is nested)

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Returns**: <code>Boolean</code> - true if the worker has a parent (is inside an iframe)  
<a name="FrameWorker+destroy"></a>

### frameWorker.destroy()
Destroy the worker

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
<a name="FrameWorker+removeListener"></a>

### frameWorker.removeListener()
Remove message listener

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
<a name="Events+fire"></a>

### frameWorker.fire(type)
Fire callback based on type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>fire</code>](#Events+fire)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to fire |

<a name="Events+on"></a>

### frameWorker.on(type, cb)
Register new callback by type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>on</code>](#Events+on)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Events+off"></a>

### frameWorker.off(type, cb)
Unregister callback by type

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>off</code>](#Events+off)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback |
| cb | <code>function</code> | Callback |

<a name="Events+once"></a>

### frameWorker.once(type, cb)
Register a callback only and remove it after the first evaluation

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>once</code>](#Events+once)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of callback to be evaluated when fired |
| cb | <code>function</code> | Callback |

<a name="Manager"></a>

## Manager
Class to wrap frame manager with custom options

**Kind**: global class  
<a name="new_Manager_new"></a>

### new Manager(opt)
Create new manager with custom options


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |

<a name="Worker"></a>

## Worker
Class to wrap frame worker with custom options

**Kind**: global class  
<a name="new_Worker_new"></a>

### new Worker(opt)
Create new worker with custom options


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |

<a name="MapxResolvers"></a>

## MapxResolvers
Class to handle MapX specific method

**Kind**: global class  

* [MapxResolvers](#MapxResolvers)
    * [.get_sdk_methods()](#MapxResolvers+get_sdk_methods) ⇒ <code>Array</code>
    * [.set_panel_left_visibility(opt)](#MapxResolvers+set_panel_left_visibility) ⇒ <code>Boolean</code>
    * [.get_views()](#MapxResolvers+get_views) ⇒ <code>Array</code>
    * [.get_views_id()](#MapxResolvers+get_views_id) ⇒ <code>Array</code>
    * [.get_view_meta_vt_attribute(opt)](#MapxResolvers+get_view_meta_vt_attribute) ⇒ <code>Object</code>
    * [.get_view_meta(opt, view)](#MapxResolvers+get_view_meta)
    * [.get_user_id()](#MapxResolvers+get_user_id) ⇒ <code>Number</code>
    * [.get_user_ip()](#MapxResolvers+get_user_ip) ⇒ <code>Object</code>
    * [.get_user_roles()](#MapxResolvers+get_user_roles) ⇒ <code>Object</code>
    * [.get_user_email()](#MapxResolvers+get_user_email) ⇒ <code>String</code>
    * [.get_language()](#MapxResolvers+get_language) ⇒ <code>String</code>
    * [.get_languages()](#MapxResolvers+get_languages) ⇒ <code>Array</code>
    * [.get_projects(opt)](#MapxResolvers+get_projects) ⇒ <code>Array</code>
    * [.get_project()](#MapxResolvers+get_project) ⇒ <code>String</code>
    * [.get_project_collections()](#MapxResolvers+get_project_collections) ⇒ <code>Array</code>
    * [.is_guest()](#MapxResolvers+is_guest) ⇒ <code>Boolean</code>
    * [.set_view_layer_filter_text(opt)](#MapxResolvers+set_view_layer_filter_text) ⇒ <code>Boolean</code>
    * [.set_view_layer_filter_numeric(opt)](#MapxResolvers+set_view_layer_filter_numeric)
    * [.set_view_layer_filter_time(opt)](#MapxResolvers+set_view_layer_filter_time) ⇒
    * [.set_view_layer_transparency(opt)](#MapxResolvers+set_view_layer_transparency) ⇒
    * [.get_view_layer_filter_numeric(opt)](#MapxResolvers+get_view_layer_filter_numeric) ⇒ <code>Number</code> \| <code>Array</code>
    * [.get_view_layer_filter_time(opt)](#MapxResolvers+get_view_layer_filter_time) ⇒ <code>Number</code> \| <code>Array</code>
    * [.get_view_layer_transparency(opt)](#MapxResolvers+get_view_layer_transparency) ⇒ <code>Number</code>
    * [.open_view(opt)](#MapxResolvers+open_view) ⇒ <code>Boolean</code>
    * [.close_view(opt)](#MapxResolvers+close_view) ⇒ <code>Boolean</code>
    * [.show_modal_login()](#MapxResolvers+show_modal_login) ⇒ <code>Boolean</code>
    * [.show_modal_view_meta()](#MapxResolvers+show_modal_view_meta) ⇒ <code>Boolean</code>
    * [.close_modal_all()](#MapxResolvers+close_modal_all) ⇒ <code>Boolean</code>

<a name="MapxResolvers+get_sdk_methods"></a>

### mapxResolvers.get\_sdk\_methods() ⇒ <code>Array</code>
List resolvers methods

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - array of supported methods  
<a name="MapxResolvers+set_panel_left_visibility"></a>

### mapxResolvers.set\_panel\_left\_visibility(opt) ⇒ <code>Boolean</code>
Set panel visibility

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.panel | <code>String</code> | Name of the panel (views, tools) |
| opt.show | <code>Boolean</code> | If true, show the panel (and hide other) |
| opt.toggle | <code>Boolean</code> | Toggle the panel |

<a name="MapxResolvers+get_views"></a>

### mapxResolvers.get\_views() ⇒ <code>Array</code>
Get list of available views as static objects

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of views  
<a name="MapxResolvers+get_views_id"></a>

### mapxResolvers.get\_views\_id() ⇒ <code>Array</code>
Get list of available views id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of id  
<a name="MapxResolvers+get_view_meta_vt_attribute"></a>

### mapxResolvers.get\_view\_meta\_vt\_attribute(opt) ⇒ <code>Object</code>
Get vector view (vt) metadata of the attribute

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - attribut metadata  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Id of the view |

<a name="MapxResolvers+get_view_meta"></a>

### mapxResolvers.get\_view\_meta(opt, view)
Get view metadata

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | options |
| opt.idView | <code>String</code> | Id of the view |
| view | <code>Object</code> | meta data object |

<a name="MapxResolvers+get_user_id"></a>

### mapxResolvers.get\_user\_id() ⇒ <code>Number</code>
Get user id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> - Current user id  
<a name="MapxResolvers+get_user_ip"></a>

### mapxResolvers.get\_user\_ip() ⇒ <code>Object</code>
Get user ip info

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Current user ip object (ip, country, region, etc)  
<a name="MapxResolvers+get_user_roles"></a>

### mapxResolvers.get\_user\_roles() ⇒ <code>Object</code>
Get user roles

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Object</code> - Current user roles  
<a name="MapxResolvers+get_user_email"></a>

### mapxResolvers.get\_user\_email() ⇒ <code>String</code>
Get user email

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Current user email  
<a name="MapxResolvers+get_language"></a>

### mapxResolvers.get\_language() ⇒ <code>String</code>
Get current language

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Two letters language code  
<a name="MapxResolvers+get_languages"></a>

### mapxResolvers.get\_languages() ⇒ <code>Array</code>
Get list of supported current languages

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of two letters language code  
<a name="MapxResolvers+get_projects"></a>

### mapxResolvers.get\_projects(opt) ⇒ <code>Array</code>
Get projects list

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - list of project for the current user, using optional filters  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Project fetching option |

<a name="MapxResolvers+get_project"></a>

### mapxResolvers.get\_project() ⇒ <code>String</code>
Get current project id

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>String</code> - Current project id  
<a name="MapxResolvers+get_project_collections"></a>

### mapxResolvers.get\_project\_collections() ⇒ <code>Array</code>
Get list of collection for the current project

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Array</code> - Array of collections names  
<a name="MapxResolvers+is_guest"></a>

### mapxResolvers.is\_guest() ⇒ <code>Boolean</code>
Test if the current user is guest

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - User is guest  
<a name="MapxResolvers+set_view_layer_filter_text"></a>

### mapxResolvers.set\_view\_layer\_filter\_text(opt) ⇒ <code>Boolean</code>
Filter view layer by text (if attribute is text)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |

<a name="MapxResolvers+set_view_layer_filter_numeric"></a>

### mapxResolvers.set\_view\_layer\_filter\_numeric(opt)
Filter view layer by numeric (if attribute is numeric)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolvers+set_view_layer_filter_time"></a>

### mapxResolvers.set\_view\_layer\_filter\_time(opt) ⇒
Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: null  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> \| <code>Array</code> | Value or range of value |

<a name="MapxResolvers+set_view_layer_transparency"></a>

### mapxResolvers.set\_view\_layer\_transparency(opt) ⇒
Set layer transarency (0 : visible, 100 : 100% transparent)

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: null  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |
| opt.value | <code>Numeric</code> | Value |

<a name="MapxResolvers+get_view_layer_filter_numeric"></a>

### mapxResolvers.get\_view\_layer\_filter\_numeric(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current numeric slider value

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+get_view_layer_filter_time"></a>

### mapxResolvers.get\_view\_layer\_filter\_time(opt) ⇒ <code>Number</code> \| <code>Array</code>
Get current time slider value

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> \| <code>Array</code> - values  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+get_view_layer_transparency"></a>

### mapxResolvers.get\_view\_layer\_transparency(opt) ⇒ <code>Number</code>
Get current transparency value for layers of a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Number</code> - value  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Options</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+open_view"></a>

### mapxResolvers.open\_view(opt) ⇒ <code>Boolean</code>
Open a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+close_view"></a>

### mapxResolvers.close\_view(opt) ⇒ <code>Boolean</code>
Close a view

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  

| Param | Type | Description |
| --- | --- | --- |
| opt | <code>Object</code> | Options |
| opt.idView | <code>String</code> | Target view id |

<a name="MapxResolvers+show_modal_login"></a>

### mapxResolvers.show\_modal\_login() ⇒ <code>Boolean</code>
Show modal login

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+show_modal_view_meta"></a>

### mapxResolvers.show\_modal\_view\_meta() ⇒ <code>Boolean</code>
Show view meta modal

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="MapxResolvers+close_modal_all"></a>

### mapxResolvers.close\_modal\_all() ⇒ <code>Boolean</code>
close all modals

**Kind**: instance method of [<code>MapxResolvers</code>](#MapxResolvers)  
**Returns**: <code>Boolean</code> - done  
<a name="_apply_filter_layer_slider"></a>

## \_apply\_filter\_layer\_slider()
Helpers

**Kind**: global function  

* * *

&copy; 2019-2020 Fred Moser
