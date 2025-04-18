## MapX mx_valid

Simple validation tool for MapX specific values

* * *

## Constants

<dl>
<dt><a href="#isNodeEnv">isNodeEnv</a></dt>
<dd><p>Check if the current environment is Node.js</p>
</dd>
<dt><a href="#regexUnsafeName">regexUnsafeName</a></dt>
<dd><p>Test for special char : not allowed
NOTES: if /g flag is set: inconsistant result:
Regex.lastIndex is not reseted between calls,
<a href="https://medium.com/@nikjohn/regex-test-returns-alternating-results-bd9a1ae42cdd">https://medium.com/@nikjohn/regex-test-returns-alternating-results-bd9a1ae42cdd</a></p>
</dd>
<dt><a href="#regexDataImg">regexDataImg</a></dt>
<dd><p>Test if valide base64</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#isEmpty">isEmpty(item)</a></dt>
<dd><p>Test if entry is empty : empty array, empty string, etc.</p>
</dd>
<dt><a href="#isNotEmpty">isNotEmpty()</a></dt>
<dd><p>Inverse isEmpty</p>
</dd>
<dt><a href="#isBbox">isBbox(item)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Simple lat/lng bbox expected from source summary</p>
</dd>
<dt><a href="#isBboxMeta">isBboxMeta(item)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Simple lat/lng bbox expected from source meta</p>
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
<dt><a href="#isViewSm">isViewSm(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view of type gj</p>
</dd>
<dt><a href="#isViewEditable">isViewEditable(item)</a></dt>
<dd><p>Test if it&#39;s a MapX view is editable</p>
</dd>
<dt><a href="#isViewVtWithRules">isViewVtWithRules(item)</a></dt>
<dd><p>Test if view vt has style rules</p>
</dd>
<dt><a href="#isViewVtWithStyleCustom">isViewVtWithStyleCustom(item)</a></dt>
<dd><p>Test if view vt has custom style</p>
</dd>
<dt><a href="#isViewVtWithAttributeType">isViewVtWithAttributeType(item, attribute)</a></dt>
<dd><p>Test if view vt has specific attribute type r</p>
</dd>
<dt><a href="#isViewRtWithLegend">isViewRtWithLegend(item)</a></dt>
<dd><p>Test if view rt has legend url</p>
</dd>
<dt><a href="#isViewRtWithTiles">isViewRtWithTiles(item)</a></dt>
<dd><p>Test if view rt has tiles</p>
</dd>
<dt><a href="#isViewDashboard">isViewDashboard(item)</a></dt>
<dd><p>Test if view  has dashbaord</p>
</dd>
<dt><a href="#isStory">isStory(item)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if story map</p>
</dd>
<dt><a href="#isArrayOf">isArrayOf(arr, fun)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Generic &quot;array of&quot; tester</p>
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
<dt><a href="#isSortedArray">isSortedArray(arr, desc)</a></dt>
<dd><p>Check if array is sorted</p>
</dd>
<dt><a href="#isAgteB">isAgteB(a, b)</a> ⇒ <code>boolean</code></dt>
<dd><p>Compare value an return</p>
</dd>
<dt><a href="#isAgtB">isAgtB(a, b)</a> ⇒ <code>Number</code></dt>
<dd><p>Compare a to b ( for sorting )</p>
</dd>
<dt><a href="#isRegExp">isRegExp(value)</a> ⇒ <code>Logical</code></dt>
<dd><p>Test for RegExp instance</p>
</dd>
<dt><a href="#isProjectId">isProjectId(id)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for valid project id</p>
</dd>
<dt><a href="#isSourceId">isSourceId(id)</a> ⇒ <code>boolean</code></dt>
<dd><p>Determines if the given ID is a valid MapX source ID.</p>
<p>A valid MapX source ID starts with &#39;mx&#39;, followed optionally by &#39;<em>vector&#39;,
and then by 5 to 7 segments of the pattern &#39;</em>[a-z0-9]{1,6}&#39;. The entire ID&#39;s
length should be within the range of 10 to 50 characters.</p>
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
<dt><a href="#isJSON">isJSON(String)</a></dt>
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
<dt><a href="#isNumericRange">isNumericRange(n, min, max)</a></dt>
<dd><p>Test if entry is numeric and in range</p>
</dd>
<dt><a href="#isBoolean">isBoolean(b)</a></dt>
<dd><p>Test if entry is boolean</p>
</dd>
<dt><a href="#isBooleanCoercible">isBooleanCoercible(b)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test for a loose boolean type, e.g. from csv...</p>
</dd>
<dt><a href="#isMap">isMap(map)</a></dt>
<dd><p>Test if is map</p>
</dd>
<dt><a href="#isLngLatInsideBounds">isLngLatInsideBounds(lngLat, bounds)</a> ⇒ <code>boolean</code></dt>
<dd><p>Checks if a LngLat coordinate is inside the given LngLatBounds object.</p>
</dd>
<dt><a href="#isBoundsInsideBounds">isBoundsInsideBounds(bounds_test, bounds)</a> ⇒ <code>boolean</code></dt>
<dd><p>Checks if a LngLatBounds object is inside another LngLatBounds</p>
</dd>
<dt><a href="#isStringRange">isStringRange(str,, min, max)</a></dt>
<dd><p>Test if entry is string and have the correct number of characters</p>
</dd>
<dt><a href="#isSafe">isSafe(x)</a></dt>
<dd><p>Test if input value is &quot;safe&quot;.
Use server side
-&gt; avoid unwanted stuff for db : columns, values, .. when prepared queries are not possible.</p>
</dd>
<dt><a href="#isSafeName">isSafeName(x)</a></dt>
<dd><p>Test if input is &quot;safe&quot; for naming db table, column.</p>
</dd>
<dt><a href="#isValidType">isValidType(type, group)</a></dt>
<dd><p>Quick type checker by group eg. image</p>
</dd>
<dt><a href="#isHTML">isHTML(str)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Test if a given string contains HTML.</p>
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
<dt><a href="#isEqualNoType">isEqualNoType(a, b)</a> ⇒ <code>boolean</code></dt>
<dd><p>Compares two values for equivalence, ignoring types and leading/trailing whitespace.</p>
</dd>
<dt><a href="#normalizeValue">normalizeValue(value)</a> ⇒ <code>string</code> | <code>number</code></dt>
<dd><p>Normalizes a value by converting it to a string, trimming whitespace,
and converting it to a number if it represents a valid number.</p>
</dd>
<dt><a href="#isUrl">isUrl(url)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Validate url</p>
</dd>
<dt><a href="#isUrlHttps">isUrlHttps(url)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Validate url with https</p>
</dd>
<dt><a href="#isUrlValidWms">isUrlValidWms(url, opt)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Check if it&#39;s expected url for wms end point.</p>
</dd>
<dt><a href="#isDateStringRegex">isDateStringRegex(date)</a></dt>
<dd><p>Validate date string</p>
</dd>
<dt><a href="#isDateString">isDateString(date)</a></dt>
<dd><p>Validate date string</p>
</dd>
<dt><a href="#isDate">isDate(date)</a></dt>
<dd><p>Validate date object</p>
</dd>
</dl>

<a name="isNodeEnv"></a>

## isNodeEnv
Check if the current environment is Node.js

**Kind**: global constant  
<a name="regexUnsafeName"></a>

## regexUnsafeName
Test for special char : not allowed
NOTES: if /g flag is set: inconsistant result:
Regex.lastIndex is not reseted between calls,
https://medium.com/@nikjohn/regex-test-returns-alternating-results-bd9a1ae42cdd

**Kind**: global constant  
<a name="regexDataImg"></a>

## regexDataImg
Test if valide base64

**Kind**: global constant  
<a name="isEmpty"></a>

## isEmpty(item)
Test if entry is empty : empty array, empty string, etc.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Any</code> | item to test |

<a name="isNotEmpty"></a>

## isNotEmpty()
Inverse isEmpty

**Kind**: global function  
<a name="isBbox"></a>

## isBbox(item) ⇒ <code>Boolean</code>
Simple lat/lng bbox expected from source summary

**Kind**: global function  
**Returns**: <code>Boolean</code> - Is lat/lng bbox object  
**Note**: : currently match api/modules/template/sql/getSourceSummary_ext_sp.sql  

| Param | Type |
| --- | --- |
| item | <code>Object</code> | 

<a name="isBboxMeta"></a>

## isBboxMeta(item) ⇒ <code>Boolean</code>
Simple lat/lng bbox expected from source meta

**Kind**: global function  
**Returns**: <code>Boolean</code> - valid meta bbox  

| Param | Type |
| --- | --- |
| item | <code>Object</code> | 

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

<a name="isViewSm"></a>

## isViewSm(item)
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

<a name="isViewVtWithRules"></a>

## isViewVtWithRules(item)
Test if view vt has style rules

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewVtWithStyleCustom"></a>

## isViewVtWithStyleCustom(item)
Test if view vt has custom style

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewVtWithAttributeType"></a>

## isViewVtWithAttributeType(item, attribute)
Test if view vt has specific attribute type r

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |
| attribute | <code>String</code> | type e.g. string; |

<a name="isViewRtWithLegend"></a>

## isViewRtWithLegend(item)
Test if view rt has legend url

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewRtWithTiles"></a>

## isViewRtWithTiles(item)
Test if view rt has tiles

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isViewDashboard"></a>

## isViewDashboard(item)
Test if view  has dashbaord

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | to test |

<a name="isStory"></a>

## isStory(item) ⇒ <code>Boolean</code>
Test if story map

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>Object</code> | Item to test |

<a name="isArrayOf"></a>

## isArrayOf(arr, fun) ⇒ <code>Boolean</code>
Generic "array of" tester

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array |
| fun | <code>function</code> | Function |

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

<a name="isSortedArray"></a>

## isSortedArray(arr, desc)
Check if array is sorted

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array to test |
| desc | <code>Boolean</code> | Descendent ? |

<a name="isAgteB"></a>

## isAgteB(a, b) ⇒ <code>boolean</code>
Compare value an return

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Any</code> | A value |
| b | <code>Any</code> | B value |

<a name="isAgtB"></a>

## isAgtB(a, b) ⇒ <code>Number</code>
Compare a to b ( for sorting )

**Kind**: global function  
**Returns**: <code>Number</code> - 1,-1 or 0  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Any</code> | A value |
| b | <code>Any</code> | B value |

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

## isSourceId(id) ⇒ <code>boolean</code>
Determines if the given ID is a valid MapX source ID.

A valid MapX source ID starts with 'mx', followed optionally by '_vector',
and then by 5 to 7 segments of the pattern '_[a-z0-9]{1,6}'. The entire ID's
length should be within the range of 10 to 50 characters.

**Kind**: global function  
**Returns**: <code>boolean</code> - - Returns true if the ID matches the pattern and length constraints; otherwise, false.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The ID to test. |

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

<a name="isJSON"></a>

## isJSON(String)
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

<a name="isNumericRange"></a>

## isNumericRange(n, min, max)
Test if entry is numeric and in range

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| n | <code>String</code> \| <code>Number</code> | string or number to test |
| min | <code>Number</code> | Minumum |
| max | <code>Number</code> | Maximum |

<a name="isBoolean"></a>

## isBoolean(b)
Test if entry is boolean

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| b | <code>Boolean</code> | boolean to test |

<a name="isBooleanCoercible"></a>

## isBooleanCoercible(b) ⇒ <code>Boolean</code>
Test for a loose boolean type, e.g. from csv...

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

<a name="isLngLatInsideBounds"></a>

## isLngLatInsideBounds(lngLat, bounds) ⇒ <code>boolean</code>
Checks if a LngLat coordinate is inside the given LngLatBounds object.

**Kind**: global function  
**Returns**: <code>boolean</code> - - Returns true if the LngLat coordinate is inside the LngLatBounds, otherwise false.  

| Param | Type | Description |
| --- | --- | --- |
| lngLat | <code>mapboxgl.LngLat</code> | The LngLat coordinate to check. |
| bounds | <code>mapboxgl.LngLatBounds</code> | The LngLatBounds object to check against. |

<a name="isBoundsInsideBounds"></a>

## isBoundsInsideBounds(bounds_test, bounds) ⇒ <code>boolean</code>
Checks if a LngLatBounds object is inside another LngLatBounds

**Kind**: global function  
**Returns**: <code>boolean</code> - - Returns true if the LngLatBounds object is inside the current bounds of getMaxBounds, otherwise false.  

| Param | Type | Description |
| --- | --- | --- |
| bounds_test | <code>mapboxgl.LngLatBounds</code> | The LngLatBounds object to check. |
| bounds | <code>mapboxgl.LngLatBounds</code> | The LngLatBounds object to compare t. |

<a name="isStringRange"></a>

## isStringRange(str,, min, max)
Test if entry is string and have the correct number of characters

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| str, | <code>String</code> | character to test |
| min | <code>Number</code> | Minumum number of characters. Default 0. |
| max | <code>Number</code> | Maximum number of characters. Default Infinity. |

<a name="isSafe"></a>

## isSafe(x)
Test if input value is "safe".
Use server side
-> avoid unwanted stuff for db : columns, values, .. when prepared queries are not possible.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Any</code> | Any |

<a name="isSafeName"></a>

## isSafeName(x)
Test if input is "safe" for naming db table, column.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Any</code> | Any |

<a name="isValidType"></a>

## isValidType(type, group)
Quick type checker by group eg. image

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | Type to test |
| group | <code>String</code> | Group : image, ... NOTE: to be completed |

<a name="isHTML"></a>

## isHTML(str) ⇒ <code>Boolean</code>
Test if a given string contains HTML.

**Kind**: global function  
**Returns**: <code>Boolean</code> - True if the string contains HTML, otherwise false.  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>String</code> | The string to test. |

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

<a name="isEqualNoType"></a>

## isEqualNoType(a, b) ⇒ <code>boolean</code>
Compares two values for equivalence, ignoring types and leading/trailing whitespace.

**Kind**: global function  
**Returns**: <code>boolean</code> - - Returns true if the normalized forms of the two values are equivalent, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>\*</code> | The first value to compare. |
| b | <code>\*</code> | The second value to compare. |

<a name="normalizeValue"></a>

## normalizeValue(value) ⇒ <code>string</code> \| <code>number</code>
Normalizes a value by converting it to a string, trimming whitespace,
and converting it to a number if it represents a valid number.

**Kind**: global function  
**Returns**: <code>string</code> \| <code>number</code> - - The normalized value.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>\*</code> | The value to normalize. |

<a name="isUrl"></a>

## isUrl(url) ⇒ <code>Boolean</code>
Validate url

**Kind**: global function  
**Note**: new version uses Url & tryCatch  
**Note**: https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url  
**Note**: https://mathiasbynens.be/demo/url-regex  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | to test |

<a name="isUrlHttps"></a>

## isUrlHttps(url) ⇒ <code>Boolean</code>
Validate url with https

**Kind**: global function  

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

<a name="isDateStringRegex"></a>

## isDateStringRegex(date)
Validate date string

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>Number</code> | to validate |

<a name="isDateString"></a>

## isDateString(date)
Validate date string

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>String</code> \| <code>Number</code> | to validate |

<a name="isDate"></a>

## isDate(date)
Validate date object

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>Date</code> | to validate |


* * *


&copy; 2019-present unepgrid.ch
