# [@fxi/mxsdk](https://github.com/unep-grid/map-x-mgl/app/src/js/sdk/#readme) *0.0.10*

> sdk for mapx app


### src/events.js


#### new Events() 

Simple event management






##### Examples

```javascript
    var e = new Events(); 
    e.on('test',()=>{console.log('ok')});
    e.fire('test') -> 'ok'
```


##### Returns


- `Void`



#### Events.constructor() 

new Event handler






##### Returns


- `Void`



#### Events.fire(type) 

Fire callback based on type




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| type | `String`  | Type of callback to fire | &nbsp; |




##### Returns


- `Void`



#### Events.on(type, cb) 

Register new callback by type




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| type | `String`  | Type of callback to be evaluated when fired | &nbsp; |
| cb | `Function`  | Callback | &nbsp; |




##### Returns


- `Void`



#### Events.off(type, cb) 

Unregister callback by type




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| type | `String`  | Type of callback | &nbsp; |
| cb | `Function`  | Callback | &nbsp; |




##### Returns


- `Void`



#### Events.once(type, cb) 

Register a callback only and remove it after the first evaluation




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| type | `String`  | Type of callback to be evaluated when fired | &nbsp; |
| cb | `Function`  | Callback | &nbsp; |




##### Returns


- `Void`




### src/framecom.js


#### new FrameManager() 

Class to create a manager to build an iframe and post message to a worker inside






##### Returns


- `Void`



#### FrameManager.constructor(opt) 

Create a manager




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| opt | `object`  | options | &nbsp; |




##### Returns


- `Void`



#### FrameManager.init()  *private method*

Init manager






##### Returns


- `Void`



#### FrameManager.destroy() 

Destroy manager






##### Returns


- `Void`



#### FrameManager.build()  *private method*

Build iframe and set its properties






##### Returns


- `Void`



#### FrameManager.setUrl(Url) 

Set url




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| Url | `string` `url`  | to use when rendering | &nbsp; |




##### Returns


- `Void`



#### FrameManager.url() 

get url






##### Returns


-  url object



#### FrameManager.render()  *private method*

Render the iframe : set the selected url






##### Returns


- `Void`



#### FrameManager.setParams(Object)  *private method*

Set url search params using an object




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| Object | `Object`  | representing the worker url params | &nbsp; |




##### Returns


- `Void`



#### FrameManager.setParam(key, value)  *private method*

Set single url param by key value




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| key | `String`  | Key of the param | &nbsp; |
| value | `Any`  | to set | &nbsp; |




##### Returns


- `Void`



#### FrameManager.post(request)  *private method*

Post data to the worker




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| request | `Object`  |  | &nbsp; |




##### Returns


- `Void`



#### FrameManager.initListener()  *private method*

Init message listener






##### Returns


- `Void`



#### FrameManager.removeListener()  *private method*

Remove message listener






##### Returns


- `Void`



#### FrameManager.handleWorkerMessage(worker)  *private method*

Handle worker message, trigger callbacks




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| worker | `Message`  | message | &nbsp; |




##### Returns


- `Void`



#### FrameManager.ask(Id, data) 

Ask / request method to the worker




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| Id | `String`  | of the request/resolver | &nbsp; |
| data | `String`  | Optional data to send to the resolver | &nbsp; |




##### Returns


- `Promise`  Promise that resolve to the resolver result



#### new FrameWorker() 

Class to create a worker / listener inside an application






##### Returns


- `Void`



#### FrameWorker.constructor(opt) 

Create a worke




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| opt | `object`  | options | &nbsp; |




##### Returns


- `Void`



#### FrameWorker.init()  *private method*

Init worker






##### Returns


- `Void`



#### FrameWorker.isNested() 

Check if the worker has a parent (is nested)






##### Returns


- `boolean`  True if the worker has a parent (is inside an iframe)



#### FrameWorker.destroy() 

Destroy the worker






##### Returns


- `Void`



#### FrameWorker.post(data)  *private method*

Post message to the parent




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| data | `Object`  | Object to send to the parent | &nbsp; |




##### Returns


- `Void`



#### FrameWorker.initListener()  *private method*

Init message listener




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
|  | `data`  |  | &nbsp; |




##### Returns


- `Void`



#### FrameWorker.removeListener() 

Remove message listener






##### Returns


- `Void`



#### FrameWorker.handleManagerMessage(Message)  *private method*

Handle message : activate resolvers




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| Message | `msg`  | object with data attribute. | &nbsp; |




##### Returns


- `Void`




### src/index.js


#### new Manager() 

Class to wrap frame manager with custom options






##### Returns


- `Void`



#### Manager.constructor(opt) 

Create new manager with custom options




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| opt | `Object`  | Options | &nbsp; |




##### Returns


- `Void`



#### new Worker() 

Class to wrap frame worker with custom options






##### Returns


- `Void`



#### Worker.constructor(opt) 

Create new worker with custom options




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| opt | `Object`  | Options | &nbsp; |




##### Returns


- `Void`




*Documentation generated with [doxdox](https://github.com/neogeek/doxdox).*
