
## MapX SDK

The package `MxSdk` ease the integration of MapX. It features a simple way to interact with MapX within a static web page or from a full featured application.

## Example

```js
import {MxSdk} from  'mxsdk';

/**
* new mxsdk instance
*/
const mxsdk = new MxSdk.manager({
  host : 'http://dev.mapx.localhost/'
  port : '8880',
  project : 'MX-HPP-OWB-3SI-3FF-Q3R'
  language : 'en'
});

/**
* When ready, begin requests
*/
mxsdk.on('ready', () => {
   /**
   * Get list of views, print them in console
   */
   mxsdk.ask('get_views').then(console.log);
  /**
   * Get geo ip info,  print it in console
   */
   mxsdk.ask('get_ip').then(console.log);
   setTimeout(()=>{
     /**
     * Change project after 3000 ms, print new list 
     * of views
     */
     mxsdk.ask('set_project','MX-JZL-FJV-RLN-7OH-QLU');
     .then(mxsdk.ask('get_views'))
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
</dl>

## Members

<dl>
<dt><a href="#h">h</a></dt>
<dd><p>Class to handle MapX specific method</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#testa">testa</a></dt>
<dd><p>Resolvers</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#_apply_layer_slider">_apply_layer_slider()</a></dt>
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
    * [.message(type, text, details)](#Events+message)

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

<a name="Events+message"></a>

### events.message(type, text, details)
Fire event of type 'message'

**Kind**: instance method of [<code>Events</code>](#Events)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of message. error, log, message, warnin, data .. |
| text | <code>String</code> | Text of the message |
| details | <code>Any</code> | Anything |

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
    * [.ask(Id, data)](#FrameManager+ask) ⇒ <code>Promise</code>
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)
    * [.message(type, text, details)](#Events+message)

<a name="new_FrameManager_new"></a>

### new FrameManager(opt)
Create a manager


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>object</code> | options |

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

<a name="FrameManager+ask"></a>

### frameManager.ask(Id, data) ⇒ <code>Promise</code>
Ask / request method to the worker

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Returns**: <code>Promise</code> - Promise that resolve to the resolver result  

| Param | Type | Description |
| --- | --- | --- |
| Id | <code>String</code> | of the request/resolver |
| data | <code>String</code> | Optional data to send to the resolver |

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

<a name="Events+message"></a>

### frameManager.message(type, text, details)
Fire event of type 'message'

**Kind**: instance method of [<code>FrameManager</code>](#FrameManager)  
**Overrides**: [<code>message</code>](#Events+message)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of message. error, log, message, warnin, data .. |
| text | <code>String</code> | Text of the message |
| details | <code>Any</code> | Anything |

<a name="FrameWorker"></a>

## FrameWorker ⇐ [<code>Events</code>](#Events)
Class to create a worker / listener inside an application

**Kind**: global class  
**Extends**: [<code>Events</code>](#Events)  

* [FrameWorker](#FrameWorker) ⇐ [<code>Events</code>](#Events)
    * [new FrameWorker(opt)](#new_FrameWorker_new)
    * [.isNested()](#FrameWorker+isNested) ⇒ <code>boolean</code>
    * [.destroy()](#FrameWorker+destroy)
    * [.removeListener()](#FrameWorker+removeListener)
    * [.fire(type)](#Events+fire)
    * [.on(type, cb)](#Events+on)
    * [.off(type, cb)](#Events+off)
    * [.once(type, cb)](#Events+once)
    * [.message(type, text, details)](#Events+message)

<a name="new_FrameWorker_new"></a>

### new FrameWorker(opt)
Create a worke


| Param | Type | Description |
| --- | --- | --- |
| opt | <code>object</code> | options |

<a name="FrameWorker+isNested"></a>

### frameWorker.isNested() ⇒ <code>boolean</code>
Check if the worker has a parent (is nested)

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Returns**: <code>boolean</code> - True if the worker has a parent (is inside an iframe)  
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

<a name="Events+message"></a>

### frameWorker.message(type, text, details)
Fire event of type 'message'

**Kind**: instance method of [<code>FrameWorker</code>](#FrameWorker)  
**Overrides**: [<code>message</code>](#Events+message)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type of message. error, log, message, warnin, data .. |
| text | <code>String</code> | Text of the message |
| details | <code>Any</code> | Anything |

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

<a name="h"></a>

## h
Class to handle MapX specific method

**Kind**: global variable  
<a name="testa"></a>

## testa
Resolvers

**Kind**: global constant  
**Access**: public  
<a name="testa.a"></a>

### testa.a(x) ⇒
REturn nothing

**Kind**: static method of [<code>testa</code>](#testa)  
**Returns**: null  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>boolean</code> | input |

<a name="_apply_layer_slider"></a>

## \_apply\_layer\_slider()
Helpers

**Kind**: global function  

* * *

&copy; 2019-2020 Fred Moser
