## MapX mx_valid

Simple validation tool for MapX specific values

* * *

## Members

<dl>
<dt><a href="#regexDataImg">regexDataImg</a></dt>
<dd><p>Test if valide base64</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#isEmpty">isEmpty(item)</a></dt>
<dd><p>Test if entry is empty : empty array, empty string, etc.</p>
</dd>
<dt><a href="#isObject">isObject(item)</a></dt>
<dd><p>Test if entry is an object</p>
</dd>
<dt><a href="#isView">isView(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view.</p>
</dd>
<dt><a href="#isViewType">isViewType(item, type, validator)</a></dt>
<dd><p>Test if it&#39;s a view of given type</p>
</dd>
<dt><a href="#isViewVt">isViewVt(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view of type vt</p>
</dd>
<dt><a href="#isViewRt">isViewRt(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view of type rt</p>
</dd>
<dt><a href="#isViewGj">isViewGj(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view of type gj</p>
</dd>
<dt><a href="#isViewEditable">isViewEditable(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view is editable</p>
</dd>
<dt><a href="#isArrayOfViews">isArrayOfViews(arr)</a></dt>
<dd><p>Test if is array of views object</p>
</dd>
<dt><a href="#isViewWms">isViewWms(view)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if a raster view has wms url</p>
</dd>
<dt><a href="#isArrayOfViewsId">isArrayOfViewsId(arr)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if array of views id</p>
</dd>
<dt><a href="#isSorted">isSorted(arr, desc)</a></dt>
<dd><p>Check if array is sorted</p>
</dd>
<dt><a href="#isRegExp">isRegExp(value)</a> ⇒ <code>Logical</code></dt>
<dd><p>Test for RegExp instance</p>
</dd>
<dt><a href="#isProjectId">isProjectId(id)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for valid project id</p>
</dd>
<dt><a href="#isSourceId">isSourceId(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view of type vt</p>
</dd>
<dt><a href="#isArrayOfSourceId">isArrayOfSourceId(arr)</a></dt>
<dd><p>Test if it&#39;s an array of MapX source id</p>
</dd>
<dt><a href="#isViewId">isViewId(id)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for valid view id</p>
</dd>
<dt><a href="#isProject">isProject(p)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for valid project</p>
</dd>
<dt><a href="#isProjectsArray">isProjectsArray(arr)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for valid project array</p>
</dd>
<dt><a href="#isPromise">isPromise(item)</a></dt>
<dd><p>Test for promise</p>
</dd>
<dt><a href="#isCanvas">isCanvas(item)</a></dt>
<dd><p>Test for canvas</p>
</dd>
<dt><a href="#isIconFont">isIconFont(item)</a></dt>
<dd><p>Test for fontawesome icon class</p>
</dd>
<dt><a href="#isArray">isArray(item)</a></dt>
<dd><p>Test if entry is an aray</p>
</dd>
<dt><a href="#isTable">isTable(item)</a></dt>
<dd><p>Test if entry is an table (array of object)</p>
</dd>
<dt><a href="#isJson">isJson(String)</a></dt>
<dd><p>Test if entry is JSON</p>
</dd>
<dt><a href="#isStringifiable">isStringifiable(item)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if stringifiable</p>
</dd>
<dt><a href="#isUndefined">isUndefined(item)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if entry is undefined</p>
</dd>
<dt><a href="#isNumeric">isNumeric(n)</a></dt>
<dd><p>Test if entry is numeric</p>
</dd>
<dt><a href="#isBoolean">isBoolean(b)</a></dt>
<dd><p>Test if entry is boolean</p>
</dd>
<dt><a href="#isMap">isMap(map)</a></dt>
<dd><p>Test if is map</p>
</dd>
<dt><a href="#isStringRange">isStringRange(str,, min, max)</a></dt>
<dd><p>Test if entry is string and have the correct number of characters</p>
</dd>
<dt><a href="#isValidType">isValidType(type, group)</a></dt>
<dd><p>Quick type checker by group eg. image</p>
</dd>
<dt><a href="#isHTML">isHTML(n)</a></dt>
<dd><p>Test if string contain HTML</p>
</dd>
<dt><a href="#isEmail">isEmail(email)</a></dt>
<dd><p>Test if entry is an email</p>
</dd>
<dt><a href="#isString">isString(str)</a></dt>
<dd><p>Test if entry is string</p>
</dd>
<dt><a href="#isFunction">isFunction(fun)</a></dt>
<dd><p>Test if entry is function</p>
</dd>
<dt><a href="#isElement">isElement(obj)</a></dt>
<dd><p>Check if an object is a html element</p>
</dd>
<dt><a href="#isEqual">isEqual(x, y)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for object equality</p>
</dd>
<dt><a href="#isUrl">isUrl(url)</a></dt>
<dd><p>Validate url</p>
</dd>
<dt><a href="#isUrlValidWms">isUrlValidWms(url, opt)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Check if it&#39;s expected url for wms end point.</p>
</dd>
<dt><a href="#isDateString">isDateString(date)</a></dt>
<dd><p>Validate date</p>
</dd>
</dl>

<a name="regexDataImg"></a>

## regexDataImg
Test if valide base64

**Kind**: global variable  
<a name="isEmpty"></a>

## isEmpty(item)
Test if entry is empty : empty array, empty string, etc.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Any</code> | item to test |

<a name="isObject"></a>

## isObject(item)
Test if entry is an object

**Kind**: global function  

| Param | Type |
| --- | --- |
| item | <code>Object</code> | 

<a name="isView"></a>

## isView(item)
Test if it's a MapX view.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewType"></a>

## isViewType(item, type, validator)
Test if it's a view of given type

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |
| type | <code>String</code> \| <code>Array</code> | or array of types |
| validator | <code>function</code> | Additionnal validator that must return boolean |

<a name="isViewVt"></a>

## isViewVt(item)
Test if it's a MapX view of type vt

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewRt"></a>

## isViewRt(item)
Test if it's a MapX view of type rt

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewGj"></a>

## isViewGj(item)
Test if it's a MapX view of type gj

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewEditable"></a>

## isViewEditable(item)
Test if it's a MapX view is editable

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isArrayOfViews"></a>

## isArrayOfViews(arr)
Test if is array of views object

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array to test |

<a name="isViewWms"></a>

## isViewWms(view) ⇒ <code>Boolean</code>
Test if a raster view has wms url

**Kind**: global function  
**Returns**: <code>Boolean</code> - valid  

| Param | Type |
| --- | --- |
| view | <code>Object</code> | 

<a name="isArrayOfViewsId"></a>

## isArrayOfViewsId(arr) ⇒ <code>Boolean</code>
Test if array of views id

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array of views id |

<a name="isSorted"></a>

## isSorted(arr, desc)
Check if array is sorted

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array to test |
| desc | <code>Boolean</code> | Descendent ? |

<a name="isRegExp"></a>

## isRegExp(value) ⇒ <code>Logical</code>
Test for RegExp instance

**Kind**: global function  
**Returns**: <code>Logical</code> - is RegExp instance  

| Param | Type |
| --- | --- |
| value | <code>Any</code> | 

<a name="isProjectId"></a>

## isProjectId(id) ⇒ <code>Boolean</code>
Test for valid project id

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Project id to test |

<a name="isSourceId"></a>

## isSourceId(item)
Test if it's a MapX view of type vt

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isArrayOfSourceId"></a>

## isArrayOfSourceId(arr)
Test if it's an array of MapX source id

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array of item to test |

<a name="isViewId"></a>

## isViewId(id) ⇒ <code>Boolean</code>
Test for valid view id

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | View id to test |

<a name="isProject"></a>

## isProject(p) ⇒ <code>Boolean</code>
Test for valid project

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| p | <code>Object</code> | Project object |

<a name="isProjectsArray"></a>

## isProjectsArray(arr) ⇒ <code>Boolean</code>
Test for valid project array

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array of projects |

<a name="isPromise"></a>

## isPromise(item)
Test for promise

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Promise</code> | item to test |

<a name="isCanvas"></a>

## isCanvas(item)
Test for canvas

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Element</code> | item to test |

<a name="isIconFont"></a>

## isIconFont(item)
Test for fontawesome icon class

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Element</code> | item to test |

<a name="isArray"></a>

## isArray(item)
Test if entry is an aray

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Array</code> | array |

<a name="isTable"></a>

## isTable(item)
Test if entry is an table (array of object)

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Array</code> | array |

<a name="isJson"></a>

## isJson(String)
Test if entry is JSON

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| String | <code>String</code> | to test |

<a name="isStringifiable"></a>

## isStringifiable(item) ⇒ <code>Boolean</code>
Test if stringifiable

**Kind**: global function  

| Param | Type |
| --- | --- |
| item | <code>Any</code> | 

<a name="isUndefined"></a>

## isUndefined(item) ⇒ <code>Boolean</code>
Test if entry is undefined

**Kind**: global function  

| Param | Type |
| --- | --- |
| item | <code>Any</code> | 

<a name="isNumeric"></a>

## isNumeric(n)
Test if entry is numeric

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| n | <code>String</code> \| <code>Number</code> | string or number to test |

<a name="isBoolean"></a>

## isBoolean(b)
Test if entry is boolean

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| b | <code>Boolean</code> | boolean to test |

<a name="isMap"></a>

## isMap(map)
Test if is map

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| map | <code>Object</code> | Map object |

<a name="isStringRange"></a>

## isStringRange(str,, min, max)
Test if entry is string and have the correct number of characters

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| str, | <code>String</code> | character to test |
| min | <code>Number</code> | Minumum number of characters. Default 0. |
| max | <code>Number</code> | Maximum number of characters. Default Infinity. |

<a name="isValidType"></a>

## isValidType(type, group)
Quick type checker by group eg. image

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type to test |
| group | <code>String</code> | Group : image, ... NOTE: to be completed |

<a name="isHTML"></a>

## isHTML(n)
Test if string contain HTML

**Kind**: global function  
**Note**: https://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not#answer-36773193  

| Param | Type | Description |
| --- | --- | --- |
| n | <code>String</code> | string to test |

<a name="isEmail"></a>

## isEmail(email)
Test if entry is an email

**Kind**: global function  

| Param | Type |
| --- | --- |
| email | <code>String</code> | 

<a name="isString"></a>

## isString(str)
Test if entry is string

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>String</code> | string to test |

<a name="isFunction"></a>

## isFunction(fun)
Test if entry is function

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| fun | <code>function</code> | Function to test |

<a name="isElement"></a>

## isElement(obj)
Check if an object is a html element

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | object to test |

<a name="isEqual"></a>

## isEqual(x, y) ⇒ <code>Boolean</code>
Test for object equality

**Kind**: global function  
**Returns**: <code>Boolean</code> - Are those object equal ?  
**Note**: asnwer by Ebrahim Byagowi at https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Object</code> | First object to compare |
| y | <code>Object</code> | Second object to compare |

<a name="isUrl"></a>

## isUrl(url)
Validate url

**Kind**: global function  
**Note**: https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url  
**Note**: https://mathiasbynens.be/demo/url-regex  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | to test |

<a name="isUrlValidWms"></a>

## isUrlValidWms(url, opt) ⇒ <code>Boolean</code>
Check if it's expected url for wms end point.

**Kind**: global function  
**Returns**: <code>Boolean</code> - valid  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | to test |
| opt | <code>Object</code> | options |
| opt.layers | <code>Boolean</code> | Should the url contains layers param ? |

<a name="isDateString"></a>

## isDateString(date)
Validate date

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>String</code> \| <code>Number</code> | to validate |


* * *


&copy; 2019-2020 Fred Moser / unepgrid.ch
