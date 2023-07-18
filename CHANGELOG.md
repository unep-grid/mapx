  - [1.12.3-beta.4](https://github.com/unep-grid/mapx/tree/1.12.3-beta.4) 

    - APP / API
        - Redirect user data (images) request to api

  - [1.12.3-beta.3](https://github.com/unep-grid/mapx/tree/1.12.3-beta.3) 

    - APP
        - Highlighter : log a warning if a feature is missing `properties.gid` 

  - [1.12.3-beta.2](https://github.com/unep-grid/mapx/tree/1.12.3-beta.2) 

    - APP
        - tab change cb : using switch for search / themes
        - Search :
            - moved facet class in it's own file
            - check if ready before search

  - [1.12.3-beta.1](https://github.com/unep-grid/mapx/tree/1.12.3-beta.1) 

    - APP
        - Theme adjustments: vegetation visibility, translation, reload manager after theme change
    - API
        - Minor bug : missing next call in IP try-catch 

  - [1.12.3-alpha.18](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.18) 

    - APP
        - Revised themes module : new button, better UX + performance

  - [1.12.3-alpha.17](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.17) 

    - APP
        - Test solving issue occuring in kubernetes, during init

  - [1.12.3-alpha.16](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.16) 

    - APP
        - Fixed issues with service worker and static mode not working

  - [1.12.3-alpha.15](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.15) 

    - APP
        - Added /health route 
        - Changed app structure to implement the healthcheck
        - Changed some db pool testing
        - Themes : solved a validation issue due to recently added building_border 

  - [1.12.3-alpha.14](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.14) 

    - APP
        - Trying to fix issue with db pool not working properly after a db restart: quit process in case of invalid pool during pool connection checkout

  - [1.12.3-alpha.13](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.13) 

    - APP 
        - Force the app to shut down if a db connection error is reported #920, let the container management system restart it, if require. 3 levels : at init (global), add session start (server), and during query. 

  - [1.12.3-alpha.12](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.12) 

    - APP 
        - Themes : configurable building borders

  - [1.12.3-alpha.11](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.11) 

    - APP 
        - Search : sort by text asc / count desc #918 

  - [1.12.3-alpha.9](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.9) 

    - APP
        - Themes: renaming + maping to older names + tests rewritten

  - [1.12.3-alpha.8](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.8) 

    - APP/API
        - Should solve issues #917, #916, #890, #919 and #920

  - [1.12.3-alpha.7](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.7) 

    - APP
        - Themes : 
            - Removed "cycle through themes" behaviour in the theme toggle button
            - Added a button to switch between monochrome / classic themes and more colored ones

  - [1.12.3-alpha.5](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.5) 
    
    - APP
        - Themes : experimental road layer generator. Configurable script to create road layers. Handle casing, tunnels, bridges (1 level), and zoom function. 

  - [1.12.3-alpha.4](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.4) 

    - APP
        - Improved themes : road casing, layer order, small path visibility, tunnels
        - Avoiding building extrusion if not in 3d mode
        - If the map pitch > 0, enable 3d mode 

  - [1.12.3-alpha.3](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.2) 
    
    - APP
        - Globe mode from sharing manager #914
        - Better themes #915

  - [1.12.3-alpha.1](https://github.com/unep-grid/mapx/tree/1.12.3-alpha.1) 
    
    - APP
        - Fixed #913

  - [1.12.2](https://github.com/unep-grid/mapx/tree/1.12.2) 

    - APP
        - Fixed issues with the view order update
        - Fixed #912

  - [1.12.1](https://github.com/unep-grid/mapx/tree/1.12.1) 

    - APP
        - prod version

  - [1.12.1-beta.5](https://github.com/unep-grid/mapx/tree/1.12.1-beta.5) 
    
    - APP
        - "null" handling is converted in real `null` in widget ( nulls not reported in tiles, therefore not available in properties -> deduced, converted as '$null' for filtering and display, then now, converted as real `null` in data rows in widgets. )

  - [1.12.1-beta.4](https://github.com/unep-grid/mapx/tree/1.12.1-beta.4) 

    - APP 
        - Workaround an issue of mapboxgl [#12747](https://github.com/mapbox/mapbox-gl-js/issues/12747), when removing some layers, then their source directly after, when using the 3d/terrain mode : updateTerrain function seems to fail
        - Update mapbox to 2.15.0; 
        - removed package 'mapbox-gl-rtl-text' package, use CDN instead (peer dependency issue)
        - Bug when vt view's attributes of length 1 -> converted as string instead of array

  - [1.12.1-beta.3](https://github.com/unep-grid/mapx/tree/1.12.1-beta.3) 

    - APP
        - Removed geolocate button
        - Projections choice : limit to only mercator + globe
        - AutoSyle : Solved an issue occuring if the attribute used for styling changed type, e.g. text -> numeric. Stats were cached.

  - [1.12.1-beta.2](https://github.com/unep-grid/mapx/tree/1.12.1-beta.2) 

    - APP
        - Added "globe" mode button. 

  - [1.12.1-beta.1](https://github.com/unep-grid/mapx/tree/1.12.1-beta.1) 

    - APP
        - Popup filter : handle nulls
        - Text filter : placeholder text contrast
        - Sliders : removed border - cleaner UI
    - SDK
        - Time filter
            - Fixed documentation
            - Added example

  - [1.12.1-alpha.6](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.6) 

    - APP
        - Highligther : fixed an issue where the highlight layer were still present after a clear, in some cases
    - SDK
        - Enable layers features filtering in static mode : numeric, text, date 
        - Enable layers opacity update in static mode
        - Added feature to set / update view's layers order using a list of views id. Should work in static mode ( independant of the view's list UI in app mode )

  - [1.12.1-alpha.5](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.5) 

    - APP
        - SearchText module : added an option to reorder item with flex instead of hiding/showing items when matched
        - Themes : fixed search text not working after tab / project change

    - API
        - Fixed an error in source summary : Cannot read properties of undefined (reading column_type)

  - [1.12.1-alpha.4](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.4) 

    - APP / SDK
        - Highlighter 
            - Removed custom filtering system / operators to use mapbox expression instead.

  - [1.12.1-alpha.3](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.3) 
    
    - APP
        - Highlighter 
            - New workflow : set / update / reset 
            - Method to filter using operators : 
                - all/any filters
                - <,>,>=,<= ... for numeric value
            - Improved performance : non matching feature's source skipped early
            - Fixed issue with geojson features not selected
    - SDK
        - Added method + tests for highlighter management
  
  - [1.12.1-alpha.2](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.2) 

    - APP
        - Auto Style
            - Support for boolean
            - Support for geom type : improved preview item
            - State saved locally : improved updating
            - Fixed issues with integer inputs : set limits and type checking
            - Support for opacity
            - Support for global size in colors mode
        - Buttons 
            - Fixed issue with buttons with icons not render properly

  - [1.12.1-alpha.1](https://github.com/unep-grid/mapx/tree/1.12.1-alpha.1) 

    - APP
        - Auto Style
            - Added translation system
            - Full refactor as a class
            - Improved performance
            - Added new mode : set size. Single color, size interpolation in a given range, row id ( row value also possible not exposed )

  - [1.12.0](https://github.com/unep-grid/mapx/tree/1.12.0) 

    - APP
        - Story Maps Editor: Fix issue with non-working tools box in editor

  - [1.12.0-alpha.2](https://github.com/unep-grid/mapx/tree/1.12.0-alpha.2) 
    
    - APP
        - Spotlight:
            - Renamed remaining "highlight with pixop" to "spotlight". 
            - Fixed an issue where small polygons or line fragments were not found at low zoom level. Should work at least up to zoom 1.
            - Increased spotlight size

  - [1.12.0-alpha.1](https://github.com/unep-grid/mapx/tree/1.12.0-alpha.1) 
    
    - APP 
        - Highlighter : refactoring. Using only one layer per source + option to select gid based on one or more views. Much faster + more reliable.

  - [1.11.0](https://github.com/unep-grid/mapx/tree/1.11.0) 

    - APP
        - Table Editor : 
            - Updated warning message during rename
            - Added typeless comparison during duplicate updates/changes removal : handsontable returns sometimes the wrong type, and comparison is done with the original value, which is always the correct type. Probably something to be solved upstream, before the type issue. Impacts the display of the "save" button in manual save mode, when all numeric undo are applied and the original value is displayed. 
        - Map Composer : 
            - Should solve issue with text selection not working in Firefox

  - [1.11.0-rc.4](https://github.com/unep-grid/mapx/tree/1.11.0-rc.4) 

    - APP
        - Story Map : 
            - Editor should handle cases when no slides are editable - removed slides or never set; 
            - Avoid reading a story with no steps
            - Should solve issue with step not reloaded after update in edit mode
        - Table editor : handsontable seems to overwrite types, and comparison for actual change check was not working. e.g. 1 === '1' was considered as a change. Unsing '==' for now + added comments
        - Code integration : download sld use editor language html and download format sld

  - [1.11.0-rc.3](https://github.com/unep-grid/mapx/tree/1.11.0-rc.3) 

    - APP 
        - View badges 
            - Badges not updated after source metadata changed : assign new metadata to source's views during badges update
        - Table editor :
            - Handsontable registers undo/redo even if no change are done. Added a function to clear all actions that does not produce a change.
            - Repair geom, missing ref to events list
        - Code integration 
            - Export to SLD: typo preventing export
    - Docker 
        - Updated postgres in docker-compose : issue with some requests. Solved by 13-3.3

  - [1.11.0-rc.2](https://github.com/unep-grid/mapx/tree/1.11.0-rc.2) 

    - APP
        - Table editor 
            - Actions in undo/redo stored the column position. After a colum removal, undo/redo related to this column were removed. But something changed and the name of the column were stored in the action object. Updated helpers accordingly
            - Bug in pending updates storage, original value overwritten by intermediate previous value
        - Drawing tool + Drag Drop
            -  Added margin if bouding box to small; 
            - Avoid duplicate layer / remove layer if already exist
        - Fixed glitch with 'filter activated list' test

  - [1.11.0-rc.1](https://github.com/unep-grid/mapx/tree/1.11.0-rc.1) 

    - APP
        - Table editor : fixed an issue in manual save mode. Table structure should not be altered until all pending changes have been rolled back or sent
        - Minor dictionnary changes

  - [1.11.0-beta.2](https://github.com/unep-grid/mapx/tree/1.11.0-beta.2) 

    - APP
        - Table editor : fixed issue with handson table removing undo/redos after data reload and adding "inserts". Workaround to ignore insert and preserve undo/redos. Removing relevent undo/redo is done when required in the module i.e. removing a column.

  - [1.11.0-beta.1](https://github.com/unep-grid/mapx/tree/1.11.0-beta.1) 
    
    - API/APP
        - Table editor : 
            - removed action "duplicate + rename", kept only "duplicate"
            - rewording
        - Table viewer :
            - Reload all config, not only data: in case of column changes, it should be displayed correctly
        - Theme : fixed an issue whith an empty options object during import.

  - [1.11.0-alpha.8](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.8) 

    - API
        - Major change : should handle #901, but impacts all stats, tiles. Using mx_sources to store table/source date_modified after an update from the table editor.

  - [1.11.0-alpha.6](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.6) 
    
    - APP / API
        - Vector source statistic : fixed issue with count of null

  - [1.11.0-alpha.5](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.5) 


    - APP / API 
        - Table editor 
            - Major improvement : dispatch + update views after structural change. i.e. if a change affects a view that is currently read in a story map in static mode, it will be reloaded, to avoid missing/renamed attribute to be requested in a style, tiles, during statistic operation or edition.
            - Re-order visual column -> impacts table viewer too
            - Retrieve + statistics, incl. nulls in a table
            - Style improvement
            - Improve validation
    - APP
        - Added timeout in theme switch to prevent an edge case.
    - API
        - Fix an issue in source summary where all values are NA, or has no rows.
    - SDK
        - Fix #904 : duplication of view when adding a view

  - [1.11.0-alpha.4](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.4) 

    - APP / API
        - Table editor 
            - Implementation of a rename / duplicate column tool 
            - Locking mecanism : lock concurrent clients when any column altering tool is used by an editor  
        - Pin view, merge change from hot fix, already in prod: Missing transaction + major bug where many view could have been shared at once
        
  - [1.11.0-alpha.3](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.3) 

    - APP
        - Improvement #899 share module
            - Max bounds sdk/url/share module : more resilient with east/west north/south inversion
            - Refactor update link : use pub/sub logic instead of linear resolver, which was causing inconsistant result
            - Added async throttle for update : it should be smoother
            - Pitch and bearing should be updated after a project change
        - Improved testing
        - #900 should be fixed : typo during heads/tails request
        
  - [1.11.0-alpha.2](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.2) 
    
    - SDK
        - Added method to add custom theme

  - [1.11.0-alpha.1](https://github.com/unep-grid/mapx/tree/1.11.0-alpha.1)

    - APP
        - Major refactoring : font management system in the theme builder.
            - Font synchronization tool :
                - Read local fonts
                - Upload fonts to Mapbox services
                - Delete remote fonts if required
                - Update pre-generated @font-face from google fonts API
            - Glyphs not used anymore, using glyphs from Mapbox services
            - Import / Export styles
            - Style Schema validation : invalid style not allowed
            - Removed ref to proprietary fonts ( licensing issues ).
        - Solved many issues with `aria` system to get a 100 in all LightHouse load testing.

  - [1.10.5-alpha.2](https://github.com/unep-grid/mapx/tree/1.10.5-alpha.2) 
    
    - APP + SDK
        - Added support for setting/getting map max bounds :
            - Project config
            - CommonLoc
            - URL
            - Sharing tool
            - Story maps 
            - Schemas
            - SDK static + app

  - [1.10.5-alpha.1](https://github.com/unep-grid/mapx/tree/1.10.5-alpha.1) 

    - APP
        - Experimental bathymetry style for "water" themes : better contrast, bathymetry lines, bathymetry labels, colors/opacity configuration using the themes tools 

  - [1.10.4](https://github.com/unep-grid/mapx/tree/1.10.4) 

  - [1.10.4-beta.2](https://github.com/unep-grid/mapx/tree/1.10.4-beta.2) 
    
    - APP
        - Theme toggle issue : wait until the map layers are fully loaded before allowing the user update the style again
        - Ignore cc view added with empty script/method
        - Reading user roles from client : user.dev does not exists -> using user.roles.developer instead ( impacts dashboards, custom code view )
        - Attributes table edition : don't allow suppression of column if used anywhere in a view, included in secondary attributes

  - [1.10.4-beta.1](https://github.com/unep-grid/mapx/tree/1.10.4-beta.1) 

    - APP 
        - Transfert of project creation shiny-> nodejs
        - Switch between themes did not wait properly the end of 'play()' (click sound) 
        - Use cb in ws echo test (internal)
        - Added view param in widget config
        - Workaround : 'is_binary' test from socket.io tried to perform a test on a view -> infinite recursion. Use cloned data instead.

  - [1.10.4-alpha.7](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.7) 

    - APP/API 
        - Partial refactoring of websocket methods, api side:
            - Exposed routes / id in api entry point
            - Removed async job system and use native callback, both side.
            - Rewrote ws testing
        - Log collection : removed `language_change` event login when no changes done
    - API    
        - Removed dependecy on `body-parser`
        - Renamed modules with a dash in name, for consistancy
        
  - [1.10.4-alpha.6](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.6) 

    - APP/API
        - Updated repo url, republished public modules, updated doc

  - [1.10.4-alpha.5](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.5) 
    
    - APP 
        - Reworked templates for widgets and custom code: added support for handler function, and not only function body. Should be backward compatible.

  - [1.10.4-alpha.4](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.4) 

    - APP
        - Modified template for widgets and added method to check of widget has been destroyed `widget.destroyed` or initialized `widget.initialized` 
        - Monaco editor : removed text wrapping, has the layout was not optimal in narrow forms

  - [1.10.4-alpha.3](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.3) 

    - APP 
        - Uploader : Disabling auto view creation for non-spatial upload ( e.g. csv )
        - Updated version of el : added case when content is numeric

  - [1.10.4-alpha.2](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.2) 

    - API
        - Added bigint and int8 as 'continuous' type (#892) : solves stats + auto style
    - APP 
        - Fixes #893, no limit to the number of rows that can be copyied
        - Code sharing tool: add a 'base map' output, to be used with mapbox studio. Use current theme and produce valid mapbox theme, with information on fonts used, if not available in mapbox studio

  - [1.10.4-alpha.1](https://github.com/unep-grid/mapx/tree/1.10.4-alpha.1) 

    - APP
        - Should solve issue with failing postgres connection not making the app quit (+reload with docker); 
        - workaround warning about /home/app not existing 
    - API
        - source module structure refactoring

  - [1.10.3](https://github.com/unep-grid/mapx/tree/1.10.3) 

    - APP
        - Fix issue with numeric slider : filter rule conflict
        - Quick fix panel dashbboard in story map not hiding controls panel : centralise behaviour as an option for all panels
    - API
        - Geolocation :
            - Set expiration to unlimited if a country is found
            - Should solve issue with stream unreadable 

  - [1.10.2](https://github.com/unep-grid/mapx/tree/1.10.2) 

    - APP
        - Base map style change, un_4 boundary : Improved dotted lines
        - Moved imported view control buttons to the right
        - Uploader improvement: re-enable all buttons as soon as all chunks are sent, instead of full uploaded process done.
        - Hide controls when showing dashboard; controls always on top when activated
        - Tom select dropdown menu: max 600px, longer list (.e.g source list, EPGS codes)
        - Modal:
            - Improved top buttons accessibility; 
        - Monaco editor in schema editor:
            - Removed fullscreen option, and added a 'expand/minimize' that should work in all view with code edition
    - API 
        - New view 
            - Issue with error reporting 
            - Use pg pool 

  - [1.10.2-alpha.8](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.8) 
    
    - APP
        - Added option to have half-right, half-left button for large modals
        - Code editor in schema editor:
            - added fullscreen mode 
            - set word wrap, ruler at 80 characters, and two spaces per tab
            - 
        - Update list of external view when the tool is requested 
        - Source visualizer : removed reset filter button 

  - [1.10.2-alpha.7](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.7) 

    - APP
        - Replaced ace editor by monaco
         
  - [1.10.2-alpha.4](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.4) 

    - APP
        - Dictionnary typo : use elipsis in "drag-n-drop" uploader message 
    - API
        - Critical Bug: The view pin handler was not properly releasing the PG client, causing a depletion of all PG clients.

  - [1.10.2-alpha.3](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.3) 

    - APP 
        - Import view from the search tool (#873) 
        - Issue with a loop inside modal (previous commit : arrangement of buttons )

  - [1.10.2-alpha.2](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.2) 

    - APP 
        - Uploader : 
            - Added button to choose files directly
            - Better arrangement of buttons
            - Improved animation
            - Added confirmation before items deletion or upload, if more than one element
            - Removed dialog message, use internal messaging
            - Improve message displaying when uploading geojson directy from view list
            - Removed modal resize - conflicted with scrolllbar
            - Complete rewrite of the form parser, using a default object as a basic schema and fetch value from the form + warn if something went wrong
            - Error's style border, only on the left
            - Items align top
            - Handle case when file ext is in capital ex. test.CPG
        -  Misc : added promise based file selector
    - API 
        - Uploader manager : 
            - Fixed issue with missing SRS, in assignation mode

  - [1.10.2-alpha.1](https://github.com/unep-grid/mapx/tree/1.10.2-alpha.1) 

    - APP 
        - New uploader #880 
 
    - API
        - Fix issue #888 : line geom detection        

  - [1.10.1](https://github.com/unep-grid/mapx/tree/1.10.1) 

    - API 
        - Fix an uncatched error during download affecting layers with some invalid geometries, when a country clip was set as download option.

  - [1.10.0](https://github.com/unep-grid/mapx/tree/1.10.0) 

  - [1.10.0-rc.1](https://github.com/unep-grid/mapx/tree/1.10.0-rc.1) 


    - APP 
        - Geostyler don't recognize 'has' expression. It's use in mapbox-gl to define null attribute. Convert to `["==",<attr>,null]`
        - View VT style 
            - issue with missing value_to -> use next value as upper bound
        - View metadata : source email with empty name -> default to email
        - Table editor :
            - Updated timeout to 60 second for the `emit` round trip : less timeouts.
            - Shortcut from table viewer : disable edit button if view is shared
            - Added postgres ARRAY type
        - Update dictionnary item 

  - [1.10.0-beta.1](https://github.com/unep-grid/mapx/tree/1.10.0-beta.1) 

    - APP
        - Added better source selector for metadata and settings edition. See #881
        - Missing support for geojson for fetching source property e.g. click
        - Table editor : fixed an error occuring  when the user closed the tool after selecting a source
        - Cancel network function in story map : do not use window.stop with firefox, it breaks shiny websocket connection and the session is disconnected.
        - Non-blink browsers (safari, firefox) don't handle offscreen canvas as expected, or not at all. Disable PixOp / Spotlight usage on those browser. See also issue #344
        - Added flags support through css. e.g. `<span class='fi fi-ch fis'></span>`
        - Fixed in "New view" type 'cc' : missing validation for dev

  - [1.10.0-beta](https://github.com/unep-grid/mapx/tree/1.10.0-beta) 

    - APP
        - Rebase 1.10.0-alpha.7 (breaking change, new dev members feature )
        - Style editor :
            - fixed missing patterns in null layers; Solved issue with null value : has nulls is not handled in mapbox gl, removing the property from the tile builder and testing for [has,<attribute>] was the only solution.
            - Fix issues with missing value; 
        - Re-enable scroll in view metadata menu;
        - SDK: Fix missing async code in tests

  - [1.10.0-alpha.12](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.12) 

    - APP
        - Style editor:
            - Legends improvement: if a border/outline is set for polygons, the legends are also updated
            - Issue with some colors saved as hex + alpha, instead of hex
        - Should solve issue with uploaded source with null geometry type

  - [1.10.0-alpha.11](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.11) 

    - APP
        - Replaced downloadjs module by modern modules : impacts download geojson, csv, canvas (mapcomposer), etc..
        - Use csv stringifier again + update version
        - Style : Should solve duplication of layers ( null + rules, if null value redifined in rules )
    - API
        - Fixed download links not working in Firefox (in dictionnary/templates)

  - [1.10.0-alpha.10](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.10) 
    
    - APP
        - Style manager
            - Use native color picker 
            - Added basic system for styling polygon outline 

  - [1.10.0-alpha.9](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.9) 

    - APP 
        - Display table: 
            - View attributes table download: use view title as filename;
            - If no view._meta available, fetch metadata
        - VT style : 
            - Added a very small transparent border for polygones features. This should be configurable in style, but not yet done.
        - Dashboard
            - Hack : if modules were used and not properly loaded using the checkboxes, added an helper to read the script and list all modules and load them + show a warning. This is temporary until all concerned dashboard are cleaned
        - Panel dashboard : 
            - improved footer, better visibility. Set footer div as an option
        - Geoserver : 
            - Set geoserver legend the same as the order of the mapx layers ( no impact on visual order in generated wms images, see #882 )
            - Issue with missing value : null or empty string were ignored
    - API 
        - Reset geoserver update state : in case of failure that skips the finally statement, at least the service restart would reset the stored state in redis.

  - [1.10.0-alpha.8](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.8) 

    - APP/API
        -  SLD creation. Solved issue with 
            - paint expression,
            - view with sld already as style._sld,
    - APP
        - Custom style view testing: handle case when no style object exists
        - Date testing : only support YYYY/MM/DD... and YYYY-MM-DD as date string

  - [1.10.0-alpha.7](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.7) 
    
    - APP
        - Breaking change: new environment variable : `MAPX_DEV_MEMBERS=[1]`Only publishers approved by the instance owners, in this list, will be allowed to edit custom code view and dashboards or create custom code view. This is temporary until the issue #878 is resolved.

  - [1.10.0-alpha.6](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.6) 

    - APP
        - Add zoomMin and zoomMax to URL parameters.
        - Name conflict in getViewRemote

    - SDK
        - Using URL object, set default. If no protocol, use 'https'. If protocol is 'https' and there is no port, use 443. Issue #865
        - Updated example1 : use async
        - Readme : added information about supported search parameters / query strings, available as `params` object #875 

  - [1.10.0-alpha.5](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.5) 
    
    - APP 
        - View metadata panel : 
            - Performance issue with gemet keywords. Don't wait, update later.
            - Metadata : missing source id in some cases  

  - [1.10.0-alpha.4](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.4) 
    
    - APP 
        - Notif center : notif container padding 10px
        - View list scrollbar : 
            - Removed content-visibility performance boost, poor UX on chrome windows
        - Table editor 
            - Adding a single colonne, e.g. using add column tool, should put the column at the end of the table
            - Timeout issue after change done with, buttons not updated, e.g. undo not available
        - View Metadata, contact list: address on a new line, removed empty div, producing a shift in the contacts bullet list
        - Upload form : removed unused form, during upload, finilize validation progress for small dataset
        - "Update app" panel : remove 'restart later' button + avoid letting the user show the 'read logs' and click back to the restart panel
        - Web workers : try to solve the 'blank' page after redeploy
        - Fix issue with code integration panel : editor layout was not updated properly after a modal window resize 
        - #871 : geoserver publication should handle custom style, null values and correctly save legend labels in SLD rules in 
            a) code integration
            b) view style save
            c) update style from server side 
        - Handsontable : rewrite stylesheet to match MapX themes.        

  - [1.10.0-alpha.3](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.3) 

    - APP
        - Dashboards / Widgets ( issue #877 ) 
            - Automatic credits / attributions links at the bottom of the dashboad panel, created when loading a package using predefined list ( `widget.modules...` )
            - Manual credits text/html from the widget editor
  
  - [1.10.0-alpha.2](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.2) 

    - APP / API 
        - Rollback evaluation version of handsontable, use the latest MIT version.
        - Solved issue : during geom validation of large batch, timeout was reached. Converted to emitGet (emit + callback), as it's more suitable in this case / longer timeout
        - CSS set content-visibility:auto globally for li,tr : should improve rendering time for large table, lists e.g. legends; Set content-visibility for views items in the views UI.
        - Handsontable v6 issue : Missing export file exporter: wrapped new method to export json -> csv 
        - Handsontable v6 issue : Missing undo / redo plugin, but avilable as method. Seems ok.
        - Handsontable : downgrade to 6.2.2 ( license issues ) + adapted code
        
    - APP 
        - Fixed bug : during new view creation, it was possible to enter an empty value in the type of view to create and create an invalid view, impossible to remove
        - Fixed bug when uploading a layer : during view creation, missing view attribute ._meta prevented to use the table viewer

  - [1.10.0-alpha.1](https://github.com/unep-grid/mapx/tree/1.10.0-alpha.1) 
   
    - APP / API
        - Refactoring :
            - New upload tool
                - Only cover geospatial layers for now, e.g. drag-n-dropped files on the map.
                - Automatic view creation at the end - more options will follow, e.g. to opt-out. 
            - Table editor: 
                - Types support : OGR automatically set attributes type during uplaod. All types used in all layers/tables are also supported in table editor.  
                - Value validation + sanitation : posgresql is used to test and cast any changes in cells, if required. No more regex testing.  

  - [1.9.45.4](https://github.com/unep-grid/mapx/tree/1.9.45.4) 
   
    - APP
        - Dynamic language change : missing language during views list update. Fallback to english prevented to switch back to another language.

  - [1.9.45.3](https://github.com/unep-grid/mapx/tree/1.9.45.3) 

    - APP 
        - Added animations option in story map when using fit bounds method

  - [1.9.45.2](https://github.com/unep-grid/mapx/tree/1.9.45.2) 
    
    - APP
        - Fixed issue with panel resize buttons not visible. Issue #864. 

  - [1.9.45.1](https://github.com/unep-grid/mapx/tree/1.9.45.1) 

    - APP 
        - Countries polygons used to highlight a particular zone / country were also hidding UN border style
        - View list : improved layout for small screen + increased meta buttons sizes 
    - API    
        - Bug with column named 'variable' not properly escaped in source summary function

  - [1.9.45](https://github.com/unep-grid/mapx/tree/1.9.45) 

    - APP 
        - Table editor:
            - Added e2e tests: update values + invalid handling
            - Fix issue with update count when alterning bad/good types + solved issue with value 0 that could have been replaced by null
            - Only one validation dialog (no choice) after changes with errors, let the user click the undo button directly.
            - In case of bad type during validation, don't ask multiple time for confirmation
            - Update buttons after succesfull dispatch cells update
            - Template text change when entering value with the wrong type
  
  - [1.9.45-rc.2](https://github.com/unep-grid/mapx/tree/1.9.45-rc.2) 

    - APP
  	    - Source metadata : add label to source url data link
      	- Minor improvement for raster legend quality
       	- Add helper, available from widgets, to extract bounding box from point + reprojection if required. 

  - [1.9.45-rc.1](https://github.com/unep-grid/mapx/tree/1.9.45-rc.1) 

    - API 
        - Postgis tiles : partial fix on tiles boundaries visible. Internal parameter to set the tile buffer : solve the issue on features highlight that shows tiles boundaries, but produce inconsistant result ( some times missing ). Kept the parameter, but set to 0. 
        - Postgres : added connection pool for short / long request. A timeout will cancel requests that are taking more than the expected time.
        - Fix issue with tile overlap feature.
        - Geometry correction : re-use buffer 0, has makevalid could produce unexpected results.
    - APP 
        - Countries selection : fixed preload issue.
        - Fix button with icon preventing click ( e.g. reset search params ) 
        - Table editor : solve issue occuring when removing a column. Internal data representation was not updated. If a column with the same name was added, old data kept showing up. 
        - Table editor solve race condition issues ( events not fired at the right time by handsontable, fixed here by a timeout )
        - Fixed swtch user 
           
  - [1.9.45-beta.6](https://github.com/unep-grid/mapx/tree/1.9.45-beta.6) 

    - API :
	    - View list: set _use_postgis_tiler in returned view object, changed tile builder, changed sql + view source loader (app)
    - APP 
        - Table editor 
        -  Should fix case when the user choses to ignore warning about invalid type with auto-save disabled, and later press 'undo' : invalid  previous change should not be added to the update stack
        - Added color code by type in column header + title (tooltip)

  - [1.9.45-beta.5](https://github.com/unep-grid/mapx/tree/1.9.45-beta.5) 

    - APP 
      - Handle WMS request when clicking in the map with a custom code view using a WMS raster source registered with the view id
      - Solved issue introduced in the previous update, producing an error when saving a view configuration
      - Table editor :
        - Removed delay for buttons state, when the table is ready
        - Solved issue when creating new column without autosave enabled, then modifying a value and pressing undo : the count was not correct. 
        - Added a warning panel when exiting the tool with unsaved changes
    - API 
      - Geometries validation : fixed issue when geometry count < chunks threshold, could have produced false negatives results

  - [1.9.45-beta.4](https://github.com/unep-grid/mapx/tree/1.9.45-beta.4) 

    - APP
      - Updated dependencies

  - [1.9.45-beta.3](https://github.com/unep-grid/mapx/tree/1.9.45-beta.3) 
    
    - APP 
      - Solve issue during layers creation : null received, but not expected by mapbox-gl
    - APP/API 
      - Postgis tiles option set in source configuraiton instead of view editor 
      - Improved postgis tiles performance ( still experimental and slower than default method )

  - [1.9.45-beta.2](https://github.com/unep-grid/mapx/tree/1.9.45-beta.2) 

    - APP
      - Sharing manager: added an option to share views activated, manually or using the SDK. Should work when static mode is used from the SDK. Should solve #860
    
  - [1.9.45-beta.1](https://github.com/unep-grid/mapx/tree/1.9.45-beta.1) 

    - APP 
      - Table editor :
        - Improved progress 
        - Drop down toolbox with geom validation and repair 
        - Improved integration with the "display table" module 
      - Tiles :
        - Added an option in view editor to select Postgis as the tile builder : can solve issue with some geometries not correctly rendered, but the performance is slightly impacted 

  - [1.9.45-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.45-alpha.1)

    - API 
      - Better geom validation + correction, when there is geometry outside the 180/-180  or 90/-90 range 
      - Tiles generation using PostGIS native solution : should solve issue #859.
      - Performance improvement when sending cached tiles
    - APP 
      - Geometries validation tool : minor changes before refactoring.

  - [1.9.44](https://github.com/unep-grid/mapx/tree/1.9.44) 

    - App 
      - Table editor : 
        - Fixed some validation issues preventing changes add/remove column propagation with multiple users 
        - Fixed bug with lock mechanism not properly enabled if a new user joined locked table edition
      - Revert disclaimer change, as it has been solved in map info box feature

  - [1.9.44-beta.9](https://github.com/unep-grid/mapx/tree/1.9.44-beta.9) 

   - APP 
      - Source editor : 
       - Bug fixes in dropdown menu for source selection 
       - Issue with list : not complete ( SQL issue )
       - Removed some tooltip in checkboxes and issues messages 
      - MapComposer : 
         - Modified dpi for some format 
         - Removed console logs / warnings 
    
  - [1.9.44-beta.8](https://github.com/unep-grid/mapx/tree/1.9.44-beta.8) 

    - APP 
      - Missing title in HTML : use the project name / translation as title or MapX as default + static.
    - APP/API 
      - Removed encrypted SQL query tool and temporary DB connections #856 
      - Added button to edit a source from the attribute table visualisation tool. Related to #854
      - Source editor, solved issue with column name validation when adding a column
      - Source editor, multiple improvement from #854
      - Include date in source list, abstract as tooltip
      - Escape column name in sql update template (Case when name has a dot in it)
      - Fixed font size issue in drop down selection (all tom-select impacted)
      - #855 serverside + client side; 
        - Update lock mecanism : don't lock if the current user is the only member
        - Added blurry background in table editor modal;
        - Changed order of the data types during column creation
      - Solved issues with undo/redo : 
        - Race condition where isRedoAvailable is not updated when requested. 
        - Button redo didnt have the correct state. Added simple debounce.
        - Handsontable : wrapper to remove deleted column from history ( hack ).
      - List of table to edit : fixed a missing a role comparison

  - [1.9.44-beta.7](https://github.com/unep-grid/mapx/tree/1.9.44-beta.7) 

   - APP 
      - New module : MapInfoBox, small utility to extract value from any property named `mx_info_box` while moving the cursor over maps layers, and display the value in a small box bellow the cursor. If available, a translation from the dictionary is displayed. 
      - Style modification to include UN disclaimer text, shown via the MapInfoBox. 
      - Updated the disclaimer itself ( avilable using the (i) button in the tools panel ).
      - Limit number of highlighted layers to 5.
      - Theme id from URL has a higher priority than the stored theme id.   

  - [1.9.44-beta.6](https://github.com/unep-grid/mapx/tree/1.9.44-beta.6) 
   
   - APP 
       - Map Composer
            - Improved sizes preset, added common screens sizes
            - Lower resolutions for A0 to A2 to avoid issues with the image extracted from canvas (still not solved for large images )
            - Added "fit map to page", "Increase/Decrease" zoom, and buttons to fit page to workspace by width or height.
            - Various improvements
       - Attributes viewer
            - Solved resize issue. Changes in modal size should correctly resize the table.

  - [1.9.44-beta.5](https://github.com/unep-grid/mapx/tree/1.9.44-beta.5) 
   
   - APP
       - Table editor 
            - Patch issue when concurrent user deletes a column, then another one try to perform an 'undo' that targeted the removed collumn. Probably an unsupported case in handsontable.

  - [1.9.44-beta.4](https://github.com/unep-grid/mapx/tree/1.9.44-beta.4) 
   
   - APP 
        - Table editor :
            - Better dialog when entering invalid values 
            - Added missing translations
            - Avoid removing invalid columns -> rename column will be implemented

  - [1.9.44-beta.3](https://github.com/unep-grid/mapx/tree/1.9.44-beta.3) 

   - APP 
        - Various translation from issue #775 

  - [1.9.44-beta.2](https://github.com/unep-grid/mapx/tree/1.9.44-beta.2) 

   - APP
        - Map Composer 
            - Translation 
            - Paper sizes preset 

  - [1.9.44-beta.1](https://github.com/unep-grid/mapx/tree/1.9.44-beta.1) 
    
   - APP/API  
        - Table editor:
            - Added logic to handle editable sources list from api, removed R logic
            - Faster source selection (ws, no R) + more info + line/column count + warning for issues 
            - SDK bindings 
            - Added tests for connection, locking, enabling, column add + remove, list source validation + more 
            - Code cleaning
   - Internal
        - Removed config for geoserver 
        - Added script to extract code stat (internal)

  - [1.9.44-beta](https://github.com/unep-grid/mapx/tree/1.9.44-beta) 
    
    - APP/API 
        - Table editor :
            - Added table size restriction in sources list in app + api service.
            - Solved issues when selecting non-source table.
  
  - [1.9.44-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.44-alpha.1) 

    - APP/API
        - Table editor 
            - Lock all concurrent table if auto save is off. Should work on multinode servers.
            - Column with invalid name on original table are loaded as read-only 
            - Improved tools button for small screen / pannel resize. Can impact other tools. 
            - Improved warning text
            - Added help -> wiki 
            - Added a list of user's email, with the count of the number of session per user, per table 
            - Invalid value can be entered, but will not be propagated. 
            - Boolean value : string true/false TRUE/FALSE -> checkbox 
            - New column : always in lowercase 
            - Added source title in the edition panel 
            - Improved summary in the 'new column' tool
           
  - [1.9.44-alpha.0](https://github.com/unep-grid/mapx/tree/1.9.44-alpha.0) 

    - APP/API
        - First version of the table edition tool:
            - Full websocket implementation
            - User Authentication 
            - Display + interactive table edition 
            - Add / remove columns 
            - Multiusers
            - Auto save (optional) 
            - Prevent unwanted large edits
            - Copy paste to/from spreadsheet

  - [1.9.43.2](https://github.com/unep-grid/mapx/tree/1.9.43.2) 

    - API 
        - Geoserver views selection: views filtering improvement  

  - [1.9.43.1](https://github.com/unep-grid/mapx/tree/1.9.43.1) 

    - APP/API 
        - Custom style can't be converted to SLD : ignore views that have custom style, are public, during the geoserver update. 

  - [1.9.43](https://github.com/unep-grid/mapx/tree/1.9.43) 
    
    - API
        - Geoserver publishing : missing public project constraint
    - APP
        - Improved theme/projection labels in UI

  - [1.9.43-beta.2](https://github.com/unep-grid/mapx/tree/1.9.43-beta.2) 
    
    - APP
        - StoryMap : added projection selection at story root level – without projection parameters for now.
        - Themes : renamed themes ( breaking > 1.9.42 )   

  - [1.9.43-beta.1](https://github.com/unep-grid/mapx/tree/1.9.43-beta.1) 

    - APP
        - PixOp : refactoring -> class + exported worker as file 
        - StoryMap : added theme selection
        - Fixed various themes bugs 
  
  - [1.9.43-beta.0](https://github.com/unep-grid/mapx/tree/1.9.43-beta.0) 

    - APP
        - Fixed issue with geoserver not being updated when the service was deployed on multiple servers
        - Filter map feature using attribute table : use expressions in filter, should solve #842
        - Added theme selection and globe projection in project's configuration 
        - Added new themes with blue water: cicle using themes selector or set it using url `?theme=<theme_id>` New themes : `ocean_dark`, `ocean_light`; 
        - Use passive listener for panel touch events, avoid selection during resize 
    - Routines
        - Fixed search index issue in search tool, where keywords were missing: typo in `sql` (fixed by @thomaspiller)
        - Added routine for updating geoserver each day 
    - Internal 
        - Removed babel, using esbuild within webpack 

  - [1.9.42](https://github.com/unep-grid/mapx/tree/1.9.42) 
 
    - API
        - socket.io, Use Redis client adapter to solve issue in swarm mode
        - websocket : during connection, if requested id/room not found, return an error
    - APP
        - Login function : typo email guest
 
  - [1.9.41](https://github.com/unep-grid/mapx/tree/1.9.41) 

    - API
        - Fixed simultaneous geoserver update
    -APP
        - Fixed SLD conversion for empty string : force null value instead to avoid missing literal tag

  - [1.9.40](https://github.com/unep-grid/mapx/tree/1.9.40) 

    - APP
        - SLD conversion: add an option to simplify expression in in layer creation
        - Added theme preset 'waterdark' not linked, available using `mx.theme.setColorsByThemeId("waterdark")`
        - Updated UN country labels (turkey->Türkiye); updated bathymetry
        - Style conversion:
            - Fixed issue with polygon with rule 'all' + sprite not rendered properly;
            - Fixed symbol label colors + position
            - Fix coloring issue of sprite in legends
        - Fixed issue in login process, if stored user id was corrupted; 
        - Basemap: maritime border set visibility to none
        - Country highlight: fixed filter expression
        - Formating + code cleaning
    - APP / API
        - Dictionnary update: Türkiye + #833 
    - Mail (dev) 
        - Invite jim, the chaos monkey, in dev mailhog service
    - API
        - Mail: explicit error message in logs

  - [1.9.40-beta.1](https://github.com/unep-grid/mapx/tree/1.9.40-beta.1) 

    - APP
        - SLD multiple issues: 
            - Use labels as rule id; 
            - Fixed failing filters; 
            - Setup as CDN for images; 
            - Experimental colors param for SVG; 
            - Merging symbolyzers e.g. sprites + polygon = single SLD layer;
            - Fixed icon sizes;
        - Maki icons : Set SVG path fill by param [experimental], for SLD dynamic colors
        - Download tool : filename -> layername + foldername
        - View sliders / filters layout fix
        - Solved issue with the `time_slider` filter: ignore missing numeric value converted as empty string
        - Project deletion: removed remaining geoserver code that produced bugs
        - Fixed overlap area calc issue
        - Fixed issue with deformed flag in catalog filters

    - API
        - Upgraded geoserver client: fixed breaking changes; code formating
        - Send mail. Report errors in api logs 
        - Fixed the SMTP 'from' mismatch
        - Download tool: 
            - Fixed bad filename,
            - Fixed multiple iso3,
            - Fixed reprojection
    - Geoserver 
        - Start script : add geoserver contacts + set proxy url in global.xml

  - [1.9.40-alpha.6](https://github.com/unep-grid/mapx/tree/1.9.40-alpha.6) 

     -APP         
        - Hide collections 

     - Internal
        - Docker images fix gid/uid 
        - Added volume in geoserver Dockerfile

  - [1.9.40-alpha.5](https://github.com/unep-grid/mapx/tree/1.9.40-alpha.5) 

     - APP/API 
        - Fixed built script / Docker files 
        - Fixed SQL for search index update
     
  - [1.9.40-alpha.4](https://github.com/unep-grid/mapx/tree/1.9.40-alpha.4) 

     - APP/API 
        - Major refactoring : migration of geoserver helpers to nodejs
        - New module to create style from boilerplate: html/js app, full style, layers and SLD
        - New build scripts for multi arch support
        - New download module, independent from app service
        - Many small changes

  - [1.9.40-alpha.2](https://github.com/unep-grid/mapx/tree/1.9.40-alpha.2) 
      
      - APP/API
        - API refactoring : conversion to ESM 
        - Updated dependencies
        - Merged hot fixes from 1.9.39.1 
      
  - [1.9.40-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.40-alpha.1) 

      - APP 
        - Maintenance : fixed some security issues + code cleaning

  - [1.9.39](https://github.com/unep-grid/mapx/tree/1.9.39) 

      - APP 
        - Disclaimer available from static mode
        - Search tool : added help button
        - New module to render Markdown files from text, url or from file
        - All wiki linked to a help button are readable from the interface
        - Cleaned some modules that used global `mx` object (on going process)
        - Removed views order from URL search parameters in app mode: use order from viewsOpen only
        - Sharing tool:
          - Fixed a bug that prevented update after manual change in textarea.
          - Improved translation 

  - [1.9.39-beta.2](https://github.com/unep-grid/mapx/tree/1.9.39-beta.2) 
      
      - SDK
        - In static mode, `get_sdk_methods` has been fixed.
        - In static mode, adding a view using `view_add` should also create the view's title block in the legend panel (#803)

  - [1.9.39-beta.1](https://github.com/unep-grid/mapx/tree/1.9.39-beta.1) 
      
      - APP 
        - Search tool, style : fixed keyword no more underlined, Capitalzed keyword in facet view; minor changes
        - Sharing Tool improvement : 
          - Copy allowed for: iframe, direct line. Other modes : disable copy
          - Text change 'Active views in the current step'
          - Sharing step's views : import missing views as temporary view when using project/app mode.
          - Text change " 'static' mode   " standardisation
        - Simplification of meta tags handling + attempt to add minimal support for opengraph/twitter, but that requires full path links to assets + SSR. We don't do that. yet.
        -  fixed issue where switching project while the modal was open; Text/language change
      - Dependencies 
        - Glyphs : moved dependencies to devDependencies
        - APP 
	  - Safe, non breaking update
        - API
 	  - Safe, non breaking update
	  - Updated mocha ( security issue, not prod, but... )
 	  - Rename requires import for sql -> 
 	  - Solve critical security issue with sql package: swicthed to node-sql-2
          - Critical update for Redis DB client
	  - Critical upgraded for nodemailer ( ⚠️ all mail based features affected )
        - Probe
	  - Upgrade deps 

  - [1.9.39-alpha.8](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.8) 
      
      - APP
          - MapComposer
            - Should fix issue with #797, where change in DPI failed to update the map canvas due to mapbox restriction: poor resolution map output; 
            - Migrated old Promise based code to async/await; 
            - Rewrite North Arrow module as a Class;
            - Modernisation of the code: const/async/await... 
            - Added red frame to visualise the page limit : visible even when the map is larger than the page; 
          -SDK
            - frameworker : Unexpected constructor name in passthrough event manager only in built package. No mapx/map event were reported back to the sdk manager


  - [1.9.39.alpha.7](https://github.com/unep-grid/mapx/tree/1.9.39.alpha.7) 

      - App
          - CommonLoc : allow multiple code as input : the extent of extents will be computed #786
          - Updated SDK build dependencies 

  - [1.9.39-alpha.6](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.6) 

      - App
          - Sharing manager :
            - Support for language change  
            - Include 3d relief + aerial mode if map position is enabled
            - Removed sharing button in view's tools
            - Removed R sharing module
            - Modified SDK resolver with deprecation notice for previous method 
            - SDK : added resolver to open, close and retrieve generated url
            - Added basic tests ( end-to-end via SDK )  
            - Revision of logic according to users feedbacks  
            - Support for predefined views list mode: e.g. injected from SDK.
          - Search tool : clickable tags should only capitalize the first letter
          - Fixed a bug were pressing tab in login/user profile form shifted the UI

  - [1.9.39-alpha.5](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.5) 

      - App
          - Major refactoring of the sharing manager ( requires additional improvement ).
          - Updated mapbox gl to 2.7.0: main change improvement of transparency on line features.

  - [1.9.39-alpha.4](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.4) 

      - App 
          - Fixed a bug in story map where the views of a step were not correcty updated after a preview 
          - Fixed a bug in view's metadata module, in case no projects data was retrieved
          - Modal panel : collapsed mode do not hide buttons bar and messages text. 
      - GeoServer
          - Added documentation about the current interaction between MapX and GeoServer

  - [1.9.39-alpha.3](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.3) 

      - APP
          - New sharing manager available in story, static and app mode. Feature available as control button:
            - Multiple social app support : Linkedin, Facebook, Twitter, Direct Link, iframe
            - Multiple views selection : layers on map, view open in list, story step views, etc.
            - Auto update according to context and driven by events : view added / removed, story step, story open / close
            - Will replace all others sharing system, now independent.

  - [1.9.39-alpha.2](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.2) 

      - APP
          - Story Map :
            - Fixed legends order. Should work even if no new views added ( #538 )
            - Show / hide story control after a delay, wheel events trigger 'show'
            - New slide class 'blur': alternative to opacity, which is used very often
            - Improved class 'shadow'
            - Re-added rounded borders to card class instead of all slides, which produced unwanted gaps in corners
            - Fixed issue in start / end limit in slide animation: animations were stoping too early
            - Editor: added webp support during upload ( better compression ) and set new limit to 2400px ( auto cropped );
          - RasterMiniMap in legends : test new script order for improving performance at creation time

  - [1.9.39-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.39-alpha.1) 

      - APP  
          - Story image uploader : solved rotate + crop issue ( #783 )

  - [1.9.38](https://github.com/unep-grid/mapx/tree/1.9.38) 

      - APP 
          - Fix some securtiy issue `npm audit fix`
          - Client view fetch typo: project => idProject, should solve #785
          - Search tool: larger vertical space in button groups to avoid scrollbars

  - [1.9.37](https://github.com/unep-grid/mapx/tree/1.9.37) 

      - APP/SDK 
          - Removed e-resize in legend; fix issues with rendering legend symbols
          - Fix line and symbols not rendering (NaN size)
          - Solves issue with point diameter->radius when using custom zoom function
      - SDK 
          - Fix issue with projects change events not being fired correctly: impacted SDK
      - Internal
          - Build script, missing -e in echo: new line returned as text. Fixed changelog too

  - [1.9.36](https://github.com/unep-grid/mapx/tree/1.9.36)
      
      - APP 
          - Added support for setting project's map projection ( experimental )
          - Improved symbols size rendering : symbols size should always map the size defined in pixels, except if "set size by zoom" is modified.
          - Replaced geol hatched patterns by generated patterns
          - Symbols anchor is set to bottom : if the map is tilted and rotated, they rotate along their Y axis and keep their initial positions. 
           
  - [1.9.35](https://github.com/unep-grid/mapx/tree/1.9.35)

      - APP
          - Clean version + changelog 

  - [1.9.35-rc.2](https://github.com/unep-grid/mapx/tree/1.9.35-rc.2) 
      
      - APP 
          - Replaced the markdown parser

  - [1.9.35-rc.1](https://github.com/unep-grid/mapx/tree/1.9.35-rc.1)

      - APP
          - Missing key in dictionnary for ANALYZE tool  
          - Reorganisation of cache cleaning function : impacts service workers too 

  - [1.9.35-alpha.5](https://github.com/unep-grid/mapx/tree/1.9.35-alpha.5)
    
      - APP
          - Added access to a searchable code changelog : click on the version number in the tool tab and during the service worker regirstration.

  - [1.9.35-alpha.4](https://github.com/unep-grid/mapx/tree/1.9.35-alpha.4)
    
      - APP/API
          - Added analyze helper to solve issue when creating new layer from the overlap tool
          - Added option in ‘validate geometry tool’ to also analyze geom;
          - Improved zoom to view : if the extent is saved in cache and not valid, it’s retrieved from the server in an alternative step.

  - [1.9.35-alpha.3](https://github.com/unep-grid/mapx/tree/1.9.35-alpha.3)
    
      - APP
          - Improved vector views with no style defined or when no nulls rule defined (\#772, \#773)
          - Fixed an issue that prevented symbols of point features being shown in legends.
          - Improvement of support for viewsListFlatMode: added a permanent option (internally) so the option is kept event after switching ‘filter activated views list’
          - Solved an issue with missing legend when using the map composer for geojson sources
          - Added translation + logic to handle missing or wrong raster source download URL
          - View style : default set ‘do not display missing values’ to true
          - Weird typo in epsg form: solved + code cleaning
      - API
          - Source metadata json layout in downloaded folder (\#763)

  - [1.8.35-alpha.2](https://github.com/unep-grid/mapx/tree/1.9.35-alpha.2)
    
      - APP/API
          - Handling apostrophes in project’s title and fields of the email sender

  - [1.9.35-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.35-alpha.1)
    
      - APP
          - Should solve issue \#672, race condition during login process: views list requested before setting the project.

  - [1.9.34](https://github.com/unep-grid/mapx/tree/1.9.34)
    
      - APP/API
          - Removed duplicated dict key, not allowed in `mx_languages` table
      - APP
          - Added instruction in README.md for developing routines
          - Attributes to popup : improved async support
          - SDK : solved an issue with custom code view with missing legend in static mode when no views were added from query

  - [1.9.33](https://github.com/unep-grid/mapx/tree/1.9.33)
    
      - APP
          - Dashboard:
              - Removed internal event system, replaced by EventSimple;
              - Solved issue with auto-resizing events callbacks
          - Story map:
              - Handling of empty story: display a message and clean state
              - Do not use keyboard handler for the navigate the map
              - Fix issue with keybaord events not working

  - [1.9.32](https://github.com/unep-grid/mapx/tree/1.9.32)
    
      - SDK
          - Fixed bug with passthrough events : mapx events not transmited to the SDK manager

  - [1.9.31](https://github.com/unep-grid/mapx/tree/1.9.31)
    
      - APP
          - Improved event manager
      - SDK
          - Updated dependencies

  - [1.9.31-alpha.2](https://github.com/unep-grid/mapx/tree/1.9.31-alpha.2)
    
      - APP
          - Story map code refactoring.
              - Should fully support async functions.
              - Flatten / improved the code structure : more small blocks. Step prior converting to class.
              - Added hard aggressive stop function to avoid the map to add layers after the story is quit
          - New keybord shortcut ‘l’. Works in edition mode if the focus is on the map and the text editor is not active
      - API
          - Get all public views : cut request duration by half.

  - [1.9.31-alpha.1](https://github.com/unep-grid/mapx/tree/1.9.31-alpha.1)
    
      - APP
          - Story map reader + editor partial refactoring: generalized async support + reworked logic. Required to fine tune async dashboard manipuation. Could be unstable in this version
          - Improved logic for controling dashbaord + legends display in story map
          - Removed dashboard / view interaction from map helpers: use dedicated module instead + fragmented long function in multiple utilities.

  - [1.9.31-alpha.0](https://github.com/unep-grid/mapx/tree/1.9.31-alpha.0)
    
      - APP
          - Added option to enable / disable widget and dashboard + modified UX accordingly
          - Modified Ace editor for json-editor : no wrap + transformed to await/async.
          - New default value for widget : more complete example, more verbose.
          - Quick change for el module : handle SVG nodes.
          - Removed default link in mirror utilities and use a tile server link and add a placeholder with {z}/{x}/{y} template as demo
      - API
          - Fix bug with email sending (double quote not valid in subject)

  - [1.9.30](https://github.com/unep-grid/mapx/tree/1.9.30)
    
      - API
      - Added mirror api rate limits in env file

  - [1.9.29](https://github.com/unep-grid/mapx/tree/1.9.29)
    
      - APP
      - Revision of view metadata panel (\#762) :
          - Removed pie chart, replaced by a column chart
          - Added mutation observer to modal panel : an optional callback is available. Used for resizing charts when the panel modal is resized.
          - Removed credits, cleaned options
          - Added logarithmic scale
          - To avoid a charts with 200+ entries, merge views per country after rank 20 in an “others” category
          - Set view activation per distinct registered user in the same cell as view activations per users to save space and avoid confusion
          - Limit count pers country to the last 12 months
          - Wording
      - API
          - Changed mirror api rate limit to 2000

  - [1.9.28](https://github.com/unep-grid/mapx/tree/1.9.28)
    
      - APP
          - Solves bug with translated labels (typo) + edge case when dict had duplicated key
          - Removed own email address in readers and viewers list, as it was redundant with ‘self’ in view’s editor. Possible duplicated elsewhere.
          - Added description for tile’s size input in raster tile view editor.
          - Tiles size is used now during WMS url creation. If the value change after the url is built, it does not change it.
          - Misc wording in translation

  - [1.9.27](https://github.com/unep-grid/mapx/tree/1.9.27)
    
      - APP/API
          - Minor refactoring of WMS configurator and mirror API. Improved error message handling during configuration. Improved labels, description and translations. Impacts also share manager UI and globally error handling.

  - [1.9.26](https://github.com/unep-grid/mapx/tree/1.9.26)
    
      - APP/API
      - Improved mirror api :
          - Standalone tool in the toolbox to edit a single URL - Useful for dashboards, custom views.
          - In raster tile’s view edition, an option is available to automatically switch on/off mirroring on all urls. Sould work on WMS Capabilities, tiles, GetFeatures and legends
          - Support for templating. e.g. {x}/{y}/{z}
          - Added rate limite ( 1000req per 15min, default wait );

  - [1.9.25](https://github.com/unep-grid/mapx/tree/1.9.25)
    
      - APP
          - Added menu in view’s metadata panel to quickly access sections and scroll back

  - [1.9.24](https://github.com/unep-grid/mapx/tree/1.9.24)
    
      - APP/API :
          - Improved geo matching by ip: instead of relying on large amount of data stored in memory and external library, periodically fetch raw data and update a table in mapx’ db. For dev, this requires a free maxmind token + env variable modification, see `mapx.dev.EXAMPLE.env`.
          - Refactoring ip related query : view’s stat, get/ip route, etc..
          - Replaced view’s activation per country table by a pie chart.

  - [1.9.23](https://github.com/unep-grid/mapx/tree/1.9.23)
    
      - APP/API: view metadata improvement. Added activation stats by user/country/distinct users + experimental support for static mode.
      - APP: test rendering vt legend with el : potential improvement, but not consistant. See comments.

  - [1.9.22](https://github.com/unep-grid/mapx/tree/1.9.22)
    
      - APP: Fix \#748 ( Mini bug style configuration )
      - APP: modal. Media query breakpoint at 640px for small screen mode
      - APP: SQL query maker : wrap in tryCatch; List to html : skip if list is emtpy
      - APP
          - Controls panel refactoring: better support for small screen, keep all buttons visible + in full size for improved usability on touch devices, reworked the auto layout
      - API
          - Public project search -\> use regex instead of similarity + better validation + add additional item by id ex. `/get/project/search?titleRegex=^UN.*$&language=en&maxByPage=20&idProjects=MX-5Z8-45E-K4I-SKH-75H`

  - [1.9.21](https://github.com/unep-grid/mapx/tree/1.9.21)
    
      - APP
          - Fixed a bug with the custom SQL query tool
      - API
          - New route to search public project by title or description: `get/project/search?searchText=<similarity expression>`
          - View search : added `projects_id` ( all projects’ id where the view is visible ) as filtering/faceting key

  - [1.9.20](https://github.com/unep-grid/mapx/tree/1.9.20)
    
      - APP
          - Fixed security issue: in admin mode, project’s invitation text field was not properly validated.
          - \#488: partial revert change: legend title should alway be visible

  - [1.9.19](https://github.com/unep-grid/mapx/tree/1.9.19)
    
      - APP
          - Fixed issues
              - \#469 Removed popop when locking story map
              - \#488 Improved legend title in static map / story mode
              - \#749 Story Map Editor: fixed editing content that overlapped the tools button

  - [1.9.18](https://github.com/unep-grid/mapx/tree/1.9.18)
    
      - APP
          - Updated sharing text / warning
      - APP/API
          - Refactor how views are filtered using URL query parameters: should handle properly case when loading private projects and displaying login box as fallback, then properly show initial query filters after login.

  - [1.9.17](https://github.com/unep-grid/mapx/tree/1.9.17)
    
      - APP:
          - Serice Workers: error when registering: waiting for an event already fired
          - Auto style, only set ‘include upper bound’ option if editor exists;
          - Table class ( e.g. view’s metadata ): break words to avoid glitch with long url visible in text

  - [1.9.16](https://github.com/unep-grid/mapx/tree/1.9.16)
    
      - APP:
          - Better UX when
          - A guest user tries to launch a non-public project
          - A view is requested but not present in a project
          - Fixed a bug where a race condition occurred for the project id : sometimes, the list of views did not match the current project.
          - Vector views style : if the auto style is used, the upper bound option must be checked. It’s done automatically when the style is applied.
      - API : bbox route returns status 200 and a message if no extent found

  - [1.9.15](https://github.com/unep-grid/mapx/tree/1.9.15)
    
      - APP
          - Style editor : if numeric variable is identical in from / to bounds, it uses now the === operator.
          - Default circle size when no radius is defined, set to 10.

  - [1.9.14](https://github.com/unep-grid/mapx/tree/1.9.14)
    
      - APP :
          - Added a basic helper to ‘fill’ options object with defaults, with a priority for default over item with undefined or null values. This solves an issue in vt layer creation with some rules used for null value, where opacity was undefined, instead of the expected ‘1’ value returned by the schema.

  - [1.9.13](https://github.com/unep-grid/mapx/tree/1.9.13)
    
      - APP:
          - Various fixes and improvement for new style upper/lower bounds selection

  - [1.9.12](https://github.com/unep-grid/mapx/tree/1.9.12)
    
      - SDK:
          - Fixed a backward compatibility issue : if the sdkToken is not set when starting the manager, the more recent worker did not start. Now, a warning is shown, but the worker starts.
      - APP
          - (Preliminary version) Numeric style have now a lower and upper bound for each rule, with a fallback to the previous system if the upper bound is not set.

  - [1.9.11](https://github.com/unep-grid/mapx/tree/1.9.11)
    
      - APP:
          - Metadata editor : update description text \#714
          - Draw tool: update wiki link \#733
      - SDK: issue with ‘map\_fly\_to’: result not parsable (circular ref). Now, the method returns its options when moveend event occurs

  - [1.9.10](https://github.com/unep-grid/mapx/tree/1.9.10)
    
      - SDK:
          - Fixed undefined ‘rslv’ \#741
      - APP
          - Style manager : Fixed duplicated style if ‘missing value’ value was also included within rules bounds, partial \#629;

  - [1.9.6](https://github.com/unep-grid/mapx/tree/1.9.6)
    
      - SDK:
          - Fixed an issue when multiple instances were launched on the same page
          - Added an example with 3 instances on the same page

  - [1.9.5](https://github.com/unep-grid/mapx/tree/1.9.5)
    
      - APP
          - Accent: new firefox/chrome introduced accent-color: added to thèmes options + modified style sheet. This brings a more custom look to radio/checkbox input.
          - Solved issue with duplicated id in view legend \#629
          - Solved missing correct promise handling for view add/remove operation
          - Added tests for ‘chaos’ handling : check that everything works as expected when a lot of views are added and removed in different order ( overlap in “on map” timing, very fast add/removal, etc );
          - Added events `view_ui_open` `view_ui_close` to have matching behaviour in the search tool when opening / closing a view. Ex. in search tool, the button should immediately switch, instead of waiting the layers of the view to be rendered.
          - Modified nested views list to handle better async callback with the fire method
          - Updated ‘path’ method: solved an issue when default was ‘false’
      - APP/API
          - Add support for custom null values in stats : impacts vt style creator, auto-style, and all stat/source summary server side. Null values can be defined and will not be counted in reports. Such value will overwrite default null values, like empty string, null, etc.
          - Uploading a vector layer with an empty attributes table should not be possible ( \#114 )

  - [1.9.4](https://github.com/unep-grid/mapx/tree/1.9.4)
    
      - SDK:
          - Integration of static mode;
          - New interface to set the manager: url can be an object with host, port, protocol;
          - Query string could be set as an object too. Set views, and all options from mapx url api are supported, and simple url still allowed. See the sdk documentation;
          - Update all examples;
          - Upgraded jsdoc;
          - Added support for generic mapbox-gl call. No limitation, but no guarantee that everything works. Use mapx specific methods if not sure. See basic example in src/js/sdk/examples/ex6/index.js
          - Added tests + documentation
          - Added example for ‘common location’ methods;
          - Fix issue with wrong `mx_countries` table when requesting bbox

  - [1.9.3](https://github.com/unep-grid/mapx/tree/1.9.3)
    
      - SDK
          - integration of ‘common locations’ methods, tests and documentation;
          - Provide latest SDK builds as assets (e.g. downloadable from the running instance of mapx, in /sdk/mxsdk.umd.js)
          - Update caniuse db
      - APP
          - Allow sending unencrypted mail: Usefull to report errors of postgres ( which is used to encrypt mails).
          - Init theme as separate entry point, to get stuff done early. It should solve the issue when the server stops before loading initial style, e.g. DB is not working -\> error message -\> display modal : the style should be readyat this point. Link to the map object is done during the remaining js initialisation. Theme configurator inputs are built only when needed, after tools tab click.
          - Async views list translation
      - API/APP
          - Add common location tools : find bbox and map fit bounds based on iso3 code, m49 code or name + language. API and client side version. API version handle re-projection too.

  - [1.9.2](https://github.com/unep-grid/mapx/tree/1.9.2)
    
      - URL for downloading rasters has been moved to metadata, the download button has been modified accordingly ( \#658 )
      - View’s metadata includes abstract and title, useful in static mode (\#666)
      - Static mode fixes issues with languages object not being detected
      - Option to style table’s odd row ( Theme -\> background accent )
      - Moved themes’ dictionary items to a separate file
      - Search index update, \#712 : project data was not translated after the first index iteration, as the original item was mutated. Cloning it solved the issue.
      - Search tool : changed layout for the filter panel to reduce layout shifts, e.g. reordering facets produced a lot of shifts, and the panel itself when toggled shifted/obstructed results list
      - Panels: changed orientation of handles to avoid obstructing scrollbar in some case

  - [1.9.1](https://github.com/unep-grid/mapx/tree/1.9.1)
    
      - APP
          - Search tool :
              - Issue \#711 reported bad behavior of the pagination. This is linked to the search tool used in backend : it does not report exact number of hits, which break the pagiation system, especially when combining filters and page offset.
              - Initial search and subsequent fast search update, e.g. using the time slider, produced a large amount of requests. An async debounce has been added to prevent this.

  - [1.9.0](https://github.com/unep-grid/mapx/tree/1.9.0)
    
      - APP
          - 1.9 serie release
      - PG init
          - Updated pg init varibles names

  - [1.8.41-rc2](https://github.com/unep-grid/mapx/tree/1.8.41-rc2)
    
      - API
          - Routines: set primary key instead of using default (first column with ‘id’
          - Upload csv/layer. Fix issue where temporary file were not cleaned

  - [1.8.40-rc1](https://github.com/unep-grid/mapx/tree/1.8.40-rc1)
    
      - APP
          - SDK resolver : typo mx.themes -\> mx.theme
      - API
          - Merge PR : update role management for mapxc
          - Upload ogr script : removed `AUTODETECT_WIDTH` and `AUTODETECT_SIZE_LIMIT` options, keeping default
          - Avoid nested error handling in `ogr.on('exit' ...`
          - Migration scripts : error handled in parent/ main method
          - formating db-utils source management (regiserOrRemove + check if table has values)
          - MapX db init : fixed role issue + added timestamp setting as init step
          - Updated migration script file names: order was not ok using file name

  - [1.8.39-beta](https://github.com/unep-grid/mapx/tree/1.8.39-beta)
    
      - APP/Routines
      - Reset search index in routines index update to avoid missing view
      - In case of missing view when requesting view’s metadata in search tool, display a message

  - [1.8.38-beta](https://github.com/unep-grid/mapx/tree/1.8.38-beta)
    
      - APP/API
          - Support for non spatial CSV as source -\> useful for custom sql queries or encrypted queries

  - [1.8.37-rc1](https://github.com/unep-grid/mapx/tree/1.8.37-rc1)
    
      - APP
          - Fix bug when having no view in project triggered an error in reactViewsCompactVector list ( used in source overlap tool )
          - Set map popup opacity at 0.7 (instead of 0.4) when mouse not hover
          - Migration during routines: impose sequential approach. Migration should always happen before dict update and index update.
          - Search tool : should fix dates range issues, when a single date was set in date range input, the input was set empty (-\> invalid), while the filter or/and badge were still active
          - Static mode : added button in legend’s view title to open the metadata panel
          - Story maps : ignore invalid view id in views list evaluation. Those views id’s probably have been added manually.

  - [1.8.36-beta](https://github.com/unep-grid/mapx/tree/1.8.36-beta)
    
      - APP/API
          - Should solve issue with geometry validation tool not updated as a reactive select input not triggered
          - Quick solve issue with public list of view used in story map editor : bad commit at some point. TODO: use search api for instead
          - Set max upload size at 200MiB
          - Added new simple type conversions -\> PG to js. Bigint were handled as string, which produced a bug
          - Fix wrong use of mglRemoveView -\> app crashed when removing a view from ‘manage external views’
          - Promoted use of promise in download source handler
          - Fixed an issue with empty files being generated (txt.info and metadata.json)
          - Solved a bug where clicked features were not filtered properly, therefore, breaking the highlighter tool
          - Set max line for style dev editor : Infinity was not appropritate for large styles (performance drop)
          - Use chroma -\> darken to set feature secondary color (e.g. polygon borders)
          - Lower opacity for map popup if mouse not over
          - Modal body : presence of a unnecessary scrollbar : overflow auto only on y
          - Fixed style issue with drop down filter menu in vector attribute table: bad zIndex of handsontable, as it’s not relative to table’s container
          - Attribute table : issue with mouse hover patched this to solve highlight issue

  - [1.8.35-beta](https://github.com/unep-grid/mapx/tree/1.8.35-beta)
    
      - APP
          - Search tool :
          - Fixed issue with date input not linked to the filter ‘badge’
          - Improved “year buttons” in result list : it should toggle between default value and selected value
          - Base admin sub national borders style : do not show before zoom 4
          - Dev style editor : do not try to diff at reset
          - Added modal panel to get search API key and configuration -\> tools tab

  - [1.8.34-beta](https://github.com/unep-grid/mapx/tree/1.8.34-beta)
    
      - APP
          - Integration of new UN layer for countries borders, countries names, and other official UN sub-national borders when available; Tweaked style : added an attribute ‘group\_size’ to deterministically set country label style according to country size (countries classified on a scale from 0 to 100, based on geographic area)
          - To facilitate map style development: Added a minimal style editor mapbox-gl-js (json) to quickly test the style tweaks. Available using `mx.helpers.showDevStyleEditor`

  - [1.8.33-beta](https://github.com/unep-grid/mapx/tree/1.8.33-beta)
    
      - APP
          - Search tool :
              - Button “Clear search” has now an “undo” icon, and triggers reset year filters too. It’s disabled if no text, year or facet filters are set.
              - Red flag/badge is now visible if year filters are set, too.

  - [1.8.32-alpha](https://github.com/unep-grid/mapx/tree/1.8.32-alpha)
    
      - APP
          - Added basic user preference storage ( not yet available in UI )
          - Reworked temporary view management : store preference; added “unlink” button to remove temporary view; text changes

  - [1.8.31-alpha](https://github.com/unep-grid/mapx/tree/1.8.31-alpha)
    
      - API/APP
          - Improved handling of view not linked, added using drag-drop or search tool
          - Fixed missing license in source metadata viewer
          - Fixed issue with local cache, that was hanging sometimes
          - Various minor changes in UI, e.g. views badges colors

  - [1.8.30-alpha](https://github.com/unep-grid/mapx/tree/1.8.30-alpha)
    
      - API
          - Faster vector source bounding box. E.g. used in vector views -\> Zoom to extent. This issue penalized some features such as views settings or static viewer.
      - APP
          - Fixed bug where sprites/pattern were not shown in legends,
          - Bug correction / improvement: partial refactoring of the construction of vector layers. Should be faster, while rendering the order correctly, especially when using overlay patterns using sprite.

  - [1.8.29-alpha](https://github.com/unep-grid/mapx/tree/1.8.29-alpha)
    
      - APP
          - Solves missing sprites in legends;
          - Cleaning old ‘resources’ config from legacy mapx version -\> probable breaking changes
          - Minor improvements of the search tool
              - Sync date keyword with slider + keyword emphasis
              - Solve nested facet groups not updating order when filtered
              - Year range slider: allow partial date ranges instead of strict min/max bounds.
              - Metadata viewer : handle cases where no concept is set
              - Fixed broken external link button
          - Gemet search + dropdown :
              - Avoid displaying full description of gemet dropdown: use tooltip instead, but keep the same heading.

  - [1.8.28-alpha](https://github.com/unep-grid/mapx/tree/1.8.28-alpha)
    
      - API :
          - Missing ‘create extension pg\_trgm’ in migration script

  - [1.8.27-alpha](https://github.com/unep-grid/mapx/tree/1.8.27-alpha)
    
      - APP / API
          - GEMET
              - Reshaped gemet local db,
              - Integration of multilingual keywords from gemet in the search index generator,
              - Modified api search by text, by list of concept : faster, more accurate, query by multiple concept ids,
              - Adapted metadata visualizer,
              - Integration of multilingual GEMET keywords in the search tool

  - [1.8.26-alpha](https://github.com/unep-grid/mapx/tree/1.8.26-alpha)
    
      - APP
          - GEMET
              - Integration of gemet keywords translation in view metadata visualizer. With link to concepts.
              - Integration of gemet concepts search in the source metadata editor

  - [1.8.25-alpha](https://github.com/unep-grid/mapx/tree/1.8.25-alpha)
    
      - APP
          - Search tool: Minor update.
              - Advanced date search in dedicated panel;
              - Source data date start and end do no use date range anymore;
              - Range year selection have a title;

  - [1.8.24-alpha](https://github.com/unep-grid/mapx/tree/1.8.24-alpha)
    
      - APP
          - Search tool : added range slider to filter view by generic years
      - API
          - Search indexes include many new fields for filtering by years + optimisation

  - [1.8.23-alpha](https://github.com/unep-grid/mapx/tree/1.8.23-alpha)
    
      - APP
          - Search tools :
              - Better performance
              - Solved 8/12 issues reported in [663](https://github.com/unep-grid/mapx/issues/663#issuecomment-843229152)

  - [1.8.22-alpha](https://github.com/unep-grid/mapx/tree/1.8.22-alpha)
    
      - APP
      - Search tool : the list of results is visually simpler. Border, shadow and unnecessary styles have been replaced by a better position of elements.

  - [1.8.21-alpha](https://github.com/unep-grid/mapx/tree/1.8.21-alpha)
    
      - APP
          - Search tool improved look and performance, less space wasted + added search stats line;
          - Modified immersive mode definition: all registered button-panels instance are hidden;
          - Solved a bug where view’s summary did not render correctly for multi-lingual items, such as project tiltles;
          - Views list, recursive sorting of the list : sorting impacts views order inside nested groups. Should not alter ancestors. Required for consistency and for testing rendered order.
      - SDK
          - Solved issue with immersive mode set/get and panels show/hide open/close. Should solve \#670
          - Added JSON export to tests

  - [1.8.20-alpha](https://github.com/unep-grid/mapx/tree/1.8.20-alpha)
    
      - APP
      - Solved an issue with EPGS code searching
      - API
      - Solved an issue with missing server-side translation

  - [1.8.19-alpha](https://github.com/unep-grid/mapx/tree/1.8.19-alpha)
    
      - Merged search feature in master

  - [1.8.18-alpha](https://github.com/unep-grid/mapx/tree/1.8.18-alpha)
    
      - APP/API
      - Added prototype for instant search on MapX public catalog

  - [1.8.17](https://github.com/unep-grid/mapx/tree/1.8.17)
    
      - APP
      - Fixed project changes when swiping the projet list with touch devices
      - Tooltip removal for touch device in previous revision was not effective, as only the dynamic tooltip placement was affected, the style was still visible.

  - [1.8.16](https://github.com/unep-grid/mapx/tree/1.8.16)
    
      - APP
      - Fixed a visual issue in mobile devices, where the lower part of a full height element was hidden behind the browser navigation bars.
      - Removed tooltips for touch device + added listener to properly cancel tooltip when the pointer leaves a tooltiped element
      - Attempt to mitigate fragile websocket connection, enable ‘allow reconnection’.

  - [1.8.15](https://github.com/unep-grid/mapx/tree/1.8.15)
    
      - APP
          - Solved issue when creating new raster view: layers were added even when no sources or tiles were configured, which produced errors messages in the console.
          - Modal : hide foot text for small screens;
          - Dropdown select with additional options allowed ( e.g. tags ): added padding. Adding tag is more visible. The user can click on an enlarged button or use the tab key to enter new tags.
          - Project list: show only higher role to save space.
          - Modal: removed bottom margin due to a max-height, in small screens.
          - Views list: removed view badges for small screens as there is not enough space.
          - Improved main panel layout upper buttons (title, language, user).

  - [1.8.14](https://github.com/unep-grid/mapx/tree/1.8.14)
    
      - APP
          - Added SQL patch to improve fetching the latest version of views
          - Minor improvement in sources management tools, that could improve MapX loading time

  - [1.8.13](https://github.com/unep-grid/mapx/tree/1.8.13)
    
      - APP
      - Fixed issues with auto-resize control panel feature: in horizontal layout the calculation was wrong and sometimes the panel button overlapped with the control buttons
      - Auto translated application texts have no more asterisk in suffix. Instead, a better explanation is written in the language selection panel

  - [1.8.12](https://github.com/unep-grid/mapx/tree/1.8.12)
    
      - APP
          - Controls panel : auto-resize. Not perfect, but cover most cases.
          - Storymap : added rotation buttons in control panel
          - Draw : improved UI/UX, added circle tool
          - Modals, new modal type: async prompt. Let the user enter value. Used in draw tool \> polygon \> circle \> radius
          - Widget container in dashboard did not react to touchmove event, when widget size was larger than the dashboad size.

  - [1.8.11-beta](https://github.com/unep-grid/mapx/tree/1.8.11-beta)
    
      - APP + API
          - Refactoring of the lateral controls toolbar.
          - Patched overflow issue with CSS tooltip. Hovering a tooltip element trigger a tooltip even if the element is nested in a container with overflow not visible: e.g. in views filter.
          - Solved language auto translation issues with templates (double bracket, sprintf) and html. Order of tags were altered by the translation system.
          - Removed cookies from MapX -\> replaced with localstorage methods. When removing the cache, this storage will also be cleaned.
          - SDK : improved consistency. It’s now possible to set the MapX encrypted token from the SDK. Solved some issues with MapX resolvers. The testing script should be ported to a standard test system, but in the meantime, this commit solved some issue with it.
          - Rewrote most of the drawing tool using better object oriented methods. For the user, change will be visible in buttons, general layout and modal prompts.
          - Improved notification center and removed app errors from notification - use console instead.
          - Adaptation of the story map module to the new controls : added step configuration for displaying 3d relief and default aerial base layer. Support for escape keystrock to quit the story map to match most video player behavior. Simplified a lot the “auto scroll” function. Stability should be improved in case of very fast step changes.
          - Overall style rewrites : better support for small screens. Not perfect, but better.
          - Download : solved a bug when the download layer did not have proper title in other languages than English.
          - Many minor changes

  - [1.8.10-beta](https://github.com/unep-grid/mapx/tree/1.8.10-beta)
    
      - APP + API
          - Changed .gitignore to allow \_built and \_cache being committed

  - [1.8.9-beta](https://github.com/unep-grid/mapx/tree/1.8.9-beta)
    
      - APP
          - Issue \#657 should be solved : views’ functionalities not properly removed after project or role change.
          - Issue regarding the profanity checker. Words collection for Arabic language produced an error. This should have been solved.
          - Views + category list : fixed a style issue with nested categories shadows in a collapsed parent category.
      - APP + API
          - Missing MapX app related text is automatically translated when building internal dictionary. Original dictionaries are not modified. Descriptions, abstracts, and any sensitive or contextual non-MapX text is not translated automatically. If a text has been translated, an asterisk is shown. A message describing this is also shown during language change. This has been done to mitigate the growing issue regarding the lack of contributions for our translation system for technical terms and templates. Contributions are welcome \!
          - Reorganization of dictionaries in the project.

  - [1.8.8-beta](https://github.com/unep-grid/mapx/tree/1.8.8-beta)
    
      - API
          - Added migration step for making sure postgres ‘track\_commit\_timestamp’ is set.

  - [1.8.7-beta](https://github.com/unep-grid/mapx/tree/1.8.7-beta)
    
      - APP
          - Using Mapbox satellite base map for “aerial theme”.

  - [1.8.6-beta](https://github.com/unep-grid/mapx/tree/1.8.6-beta)
    
      - APP
          - SDK : updated function to open/close views/settings panel
      - API ( internal )
          - Upgraded docker image to node 15.08
          - New module for forward only, transactional SQL migration patching. With lock support.
          - Translation table available and automatically updated in DB

  - [1.8.5-beta](https://github.com/unep-grid/mapx/tree/1.8.5-beta)
    
      - Improvement
          - Issue \#635:
              - Better handling when a user access a private project whithout being logged in. The default project is shown, with all views.
              - If requested views are not available, a message is shown, and all views are displayed.

  - [1.8.4-beta](https://github.com/unep-grid/mapx/tree/1.8.4-beta)
    
      - Bug fixes
          - Stability and improvement from previous 1.8.\* changes

  - [1.8.3-beta](https://github.com/unep-grid/mapx/tree/1.8.3-beta)
    
      - New feature
          - APP
              - Added for M49 official geographic keywords in the source metadata editor. This will be improved in the future.

  - [1.8.2-beta](https://github.com/unep-grid/mapx/tree/1.8.2-beta)
    
      - Bug fixes
          - Stability and improvement from previous 1.8.\* changes

  - [1.8.1-alpha](https://github.com/unep-grid/mapx/tree/1.8.1-alpha)
    
      - Bug fixes
          - Internal checklist

  - [1.8.0-alpha](https://github.com/unep-grid/mapx/tree/1.8.0-alpha) **NOTE: preview version, not tested**
    
      - Improvement
          - App:
              - UI update. Unification of buttons, panels.
              - Better UX with fixes requested in \#617, \#618, \#619
              - Start uniformization of notification with the “Nofification center”. For now, only message sent during download and email feedback is sent. Once stable, will cover all async and long processes: attribute table, overlaps, upload, etc.
              - Geoserver Async call with email feedback for views and source update. All requests were blocking. It should be a lot faster now
              - Experimental shiny-server removal, as it was interfering with the docker logic when a process was failing. We rely on direct connexion. Traefik should ensure sticky connexion.
              - Minor changes.
          - Api:
              - Major refactoring:
                  - All modules are required using unfied ‘<span class="citation" data-cites="mapx">@mapx</span>/’.
                  - Translation system ported.
                  - Email templating ported.
                  - A lot of migration from promises chain to async/await.
                  - Websocket with authentication (now used only for upload progress). Backward compatible with HTTP partial write.

  - [1.7.11](https://github.com/unep-grid/mapx/tree/1.7.11)
    
      - Improvement
          - App : changed country label + style to better match UN clear map
          - SDK : Better testing + allow passing function as text through messaging system

  - [1.7.10](https://github.com/unep-grid/mapx/tree/1.7.10)
    
      - Bug fix
      - When editing and previewing large story maps, fixes an issue with legends not being rendered, which blocked subsequent operations.

  - [1.7.9](https://github.com/unep-grid/mapx/tree/1.7.9)
    
      - Bug fix
      - Linkage between download source and manage source reactive object was not set properly. Table of view did not appear, and validation was not performed

  - [1.7.8](https://github.com/unep-grid/mapx/tree/1.7.8)
    
      - Bug fix
          - Tools source manage : typo. Produced an error and the app crashed when a source was edited.

  - [1.7.7](https://github.com/unep-grid/mapx/tree/1.7.7)
    
      - Bug fix
          - URL query string parameter “theme” e.g ?theme=smartgray ?theme=nolabdark did not work
      - Improvement
          - Added missing dictionnary item for map feature highlight
      - Internal
          - Removed unused file
          - Set `el` package to version 0.1.5, removed babel config, as microbundle has some sensible defaults.

  - [1.7.6-beta](https://github.com/unep-grid/mapx/tree/1.7.6-beta)
    
      - Bug fix
          - Fix bug where requested theme color item did not return in static mode
          - Fix missing string `filterActivated` in sharing url
          - Fix issue with highlight not displayed in dashboard mode w/o popup

  - [1.7.5-beta](https://github.com/unep-grid/mapx/tree/1.7.5-beta)
    
      - Improvement
          - Language : support for Chinese. Thanks Tuo Wang and Jingyi Jiang \!
          - Sharing manager : new options to filter views and hide category in the views’ list
          - Highlight tools :
              - Support for GeoJSON view
              - Added theme entry to set highlight color
              - If the popup close, remove the highlight layer
              - Use color property of highlighter feature instead of opacity, as layer opacity is managed by the transparency slider only.
              - General improvement and stability. Still experimental.
              - More subtile animation
          - Style creator, change remaining defaults requested in \#596
      - Bug fix
          - Reordering layer was done before all layers were displayed resulting to inconsistancy
      - Internal
          - Removed most of the method to convert colors and use chroma-js instead to improve robustness with edge cases.

  - [1.7.4-beta](https://github.com/unep-grid/mapx/tree/1.7.4-beta)
    
      - New feature
          - APP:
              - Implemented new module to highlight things when clicking them on the map. Experimental.
      - Changes
          - API
              - Set postgres timeout as settings.
          - APP
          - InconFlash is now a module. Added example of usage.
      - Bug fixes
          - APP
              - Fixed issue with legend displayed incorrectly
          - APP/API
              - Fixed some cache issue
      - Internal
          - API
              - Fully rebuilt API image on node:12.19-alpine
                  - Compiled GDAL 3.1.3 from scratch add needed modules + solve dependencies issue
                  - Added tags to base image instead of latest
                  - Set higher memory limit for node : 4GB

  - [1.7.3-beta](https://github.com/unep-grid/mapx/tree/1.7.3-beta)
    
      - Bug fixes
          - APP
              - Solved a bug when minicache encountered html values;
      - Improvement
      - APP/API
          - Source summary, allow all binnings method to have bounds from a single number in case of very skewed distribution (\#596) ;
      - APP
          - Better modal background : use pseudo-elements. It should avoid having modal siblings still accessible when background is set.
          - Added reverse mode in palette colors.
          - Set icon flash as a module using class.
          - Added better click visual feedback on views panel - could be ported to the whole app.
          - Refactoring cache / fetch management for wms and source summary:
          - Unifiyng TTL and timeout (app side);
          - The button to remove cache has a confirmation step; It will remove all cache and stored data know to MapX. At least, what is accessible by service workers and localforage; It does not trigger a reload anymore.
          - Source summary for views add a first step, no cached, to get source timestamp. This should avoid issues when the source is modified during a session.
          - Partial rewrite of main dot templates: more flexibility to partial view UI loading.
          - Filter tools are now generated only on demand. They need cached response of summary. Should be invalidated if the source or the view change.

  - [1.7.2](https://github.com/unep-grid/mapx/tree/1.7.2)
    
      - Improvement
          - APP/API
              - Added application\_name parameter in api and app. This parameter is usefull to perform request on DB `SELECT usename, application_name, state FROM pg_stat_activity`.
              - Removed references to a master connexion from the app : a single pool of connexion is used instead of two. Access to a master DB in case of DB clustering could still be made using `NO LOAD BALANCE` header in queries string.
              - Rewrote mapx specific wrappers around library pool functions.
              - Using onStop shiny function to launch cleaning steps should guarantee that no pool remains un-closed, and therefore avoiding memory leaks. Previous approach was made using the .Last command which is fired at the end of the R session. Maybe a combination of the two approaches could even be better.

  - [1.7.1](https://github.com/unep-grid/mapx/tree/1.7.1)
    
      - Bug fixes
          - APP/API
          - Bug generated by previous fix : can’t ignore empty string in numeric variables

  - [1.7.0](https://github.com/unep-grid/mapx/tree/1.7.0)
    
      - Bug fixes
          - APP/API
              - In style form and summary stat, changed the limit of distinct values for categorical variables in list and table to 1e4 instead of 100; Removed nulls and empty strings from lists as they will be managed by the ‘missing values’ section

  - [1.6.115-beta](https://github.com/unep-grid/mapx/tree/1.6.115-beta)
    
      - Bug fixes
          - APP:
              - Add the timestamp of the source to tile request, to invalidate browser or service worker cache.
              - mx\*valid module: Add regex rule to accept `\_o*` in source id suffix
              - Fixed issue when wms url is wrong or missing;
              - Removed abstract from wms list, set abstract content as (native) tooltip
              - Solved issue where null values where filtered out after numeric slider update

  - [1.6.114-beta](https://github.com/unep-grid/mapx/tree/1.6.114-beta)
    
      - Bug fixes
          - APP/API
              - Solved an issue with cached source summary (extent, table, etc)
              - Added a compatibility bridge for dot template that still use stat stored in views object
          - APP
              - Attribute table : wrong type for string -\> should be ‘text’ in handsontable.
          - API
              - Set default ‘simple type’ to ‘string’ -\> if unexpected type, display as string

  - [1.6.113-beta](https://github.com/unep-grid/mapx/tree/1.6.113-beta)
    
      - Bug fixes
          - SDK : polyfill for .contains method seems fail. Replaced with querySelector. Updated module list in app and sdk

  - [1.6.112-beta](https://github.com/unep-grid/mapx/tree/1.6.112-beta)
    
      - Bug fixes
          - APP :
              - Download raster -\> wrong file type
              - Zoom to wms raster
              - Filter by missing value (legend + popup) did not work
              - Popup : value 0 produced “missing value” message
              - First style of a new view : failed to detect attribute type
              - Buttons ‘find extent’, ‘zoom to displayed features’, ‘show attribute table’ was visible event for new vt view without source
              - JSON schema based form : diff message was shown even when no diff between locally saved data and data from db, if the timestamp was not the same.
              - Dynamic layer list was not invalidated after uploading a new source or creating a new source using the overlap tool
              - Default opacity set to 0.7 for rules and null rule.
      - Improvement
          - SDK
              - Better README.md

  - [1.6.111-beta](https://github.com/unep-grid/mapx/tree/1.6.111-beta)
    
      - New features
        
          - APP
              - loadHighcharts / dashboard : added `exporting` and `export` data modules for highcharts
              - Style rule parser :
                  - Added option to handle upper bound inside intervals. Both option and logic are supported now.
                  - Partial refactoring: reduce code size, use async / await instead of chaining promises
    
      - Bug fixes
        
          - SDK
            
              - Issue with dependencies strangely not included in build. Need maybe further investigation
        
          - APP
            
              - Excluded remaining swp file from precaching, which caused an error in console
              - Issue with path construction for the download file link in download modal
              - Source summary: In case of error, return default and consol.warn instead of blocking. It could be expected in some cases and MapX should work without it
              - View GeoJSON: added back ‘zoom to visible features’ with fallback to ‘zoom to extent’
              - Dashboard: added template value in script parsing rejection message
        
          - API
            
              - Source summary : allow spaces in attribute names
              - Invalidate tile cache if the source, the mask or the attributes requested change
    
      - Internal
        
          - Ignore module dist folder

  - [1.6.110-beta](https://github.com/unep-grid/mapx/tree/1.6.110-beta)
    
      - Bug fixes
          - API
              - Source summary, variable binning : solved an issue with max upper class, wrong binning when using integers, minor changes
          - APP
          - View ‘auto style’: Added a validation to test for duplicated rules. Could occurs when using quantile and a skewed distribution.
          - Service worker : precache list included .DS\_Store file, but ignored by git and dockerfile. Produced 404 errors. Solved by modifying the regex in the webpack prod file.

  - [1.6.109-beta](https://github.com/unep-grid/mapx/tree/1.6.109-beta)
    
      - Improvement
          - APP
              - Auto style editor : binning method have translated label
              - Vector view edit : a button to request source summary has been reactivated with the new stat summary overview
      - Bug fixes
          - APP
              - Source summary.
                  - Total count did not match class count.
                  - Default and validation in APP did not match validation in server resulting in a number of class by default in UI, if it was not valid server side.

  - [1.6.108-beta](https://github.com/unep-grid/mapx/tree/1.6.108-beta)
    
      - New feature
          - APP
              - Automatic style creator based on stats produced by the API (experimental)
              - New color picker : palettes are handled by the automatic style creator
      - Internal
          - APP: eslint step before any build, reorganising dot files.

  - [1.6.107-beta](https://github.com/unep-grid/mapx/tree/1.6.107-beta)
    
      - New feature
          - APP : new method to ease fetching data through MapX mirror.
      - Improvement
          - API : simplify mirror method, copy back the response headers.
          - APP, WMS interaction : exception as image; added busy interface when waiting.
      - Bug fixes
          - APP, WMS request: solved issue occuring with with empty styles in getMap request.
          - APP: Solved internal bug occuring when a new view without sources was saved.
          - APP, error manager : Error message not correctly displayed when extracting promise error message.

  - [1.6.106-beta](https://github.com/unep-grid/mapx/tree/1.6.106-beta)
    
      - New features
          - API: Source summary can now return automatic binning for a continuous variable. Method implemented : jenks, equal\_interval, heads\_tails, quantile. e.g. `idSource=<id of the source >&idAttr=<variable name>&binsMethod=<jenks | equal_interval | heads_tails | quantile>&binsNumber=< integer >0 & <= 100>`

  - [1.6.105-beta](https://github.com/unep-grid/mapx/tree/1.6.105-beta)
    
      - Internal
          - API : remove token based restriction on route `/get/mirror` as it prevented usage from static site.

  - [1.6.104-beta](https://github.com/unep-grid/mapx/tree/1.6.104-beta)
    
      - Improvement
          - APP, SDK : Added a test to control that the worker code match the manager version. An error is reported within the messaging system if there is a mismatch. e.g. `mapx.on('message', (m)=>m.level=='error'?console.error(m.text):console.log('not an error'))`
      - Bug fixes
          - API : tile cache was not invalidated properly after the view’s attributes list modification
      - Internal
          - APP, ViewsFilter : all toggles are now called checkboxes.
          - APP, SDK : ( PR \#564 ) tests can be launched by group, via a parameter in the URL.

  - [1.6.103-beta](https://github.com/unep-grid/mapx/tree/1.6.103-beta)
    
      - New feature
          - SDK : Set/Get views filter. The view list can be managed from new method in the SDK. See issue \#576 for details.

  - 1.6.4 - 1.6.102
    
      - Note: Changelog will be completed at that point. See commit messages for details.

  - [1.6.4-beta](https://github.com/unep-grid/mapx/tree/1.6.4-beta)
    
      - New feature
          - New view integrated filter system : search using text with basic regex parsing, tags, activated views. Tags order reacts to language change. Two mode are available: union and intersection. Views count is more accurate and match all kinds of filters.
          - Views list : views can be repositioned with a wide range of options : date, title, drag and drop, relative position. A history of changes is kept. The order can be saved. Nessted groups can be created. Groups can be created, deleted, edited. All options are available with a right click in the list that produce a contextual menu. Content change according to click location.
      - Improvement
          - APP
          - Internal unified event and listener management
          - Code refactoring : code rewrite using more strict structure, transfer method in dedicated modules (work in progress)
          - Remove direct access to an attribute table from a view if “allow download” in the source settings is not set
          - Minimize button in modal window
          - Set file size limit for upload
      - Bug fixes
          - APP
              - In select box, drop-down menu always visible.
              - Story autostart has been reimplemented
              - Story map slides effect
              - The project spatial parameters are not reset on the map after a save
              - Various fixes
      - Breaking changes
          - API
              - We do not use connection pool : pooling should be done by a sensible pooling system, like pg\_pool.
              - Instead of using OGR to transfer spatial data to the DB, a first step with “PGDump” is made, then the result is piped through psql.

  - [1.5.54](https://github.com/unep-grid/mapx/tree/1.5.54)
    
      - Improvement
          - APP
              - Added new contact field in project’s role settings
          - APP/API
              - Added text version of html email messages

  - [1.5.53](https://github.com/unep-grid/mapx/tree/1.5.53)
    
      - New feature
          - APP
              - New ‘root mode’ that allows platform administrators to switch user in order to solve issues.
      - Improvement
          - APP
              - Login messages for single use passwords or tokens are sent using an html template instead of raw text.

  - [1.5.52](https://github.com/unep-grid/mapx/tree/1.5.52)
    
      - Improvement
          - APP
              - Added options in projects to enable or not the join buttons to request membership see issue \#251;
      - Bug fixes
          - APP
              - Fixes a bug where a guest user could see the join buttons

  - [1.5.51](https://github.com/unep-grid/mapx/tree/1.5.51)
    
      - Improvement
          - APP
              - Cleaned configuration files
              - Added email configuration for setting default emails : bot, admin, guest.

  - [1.5.50](https://github.com/unep-grid/mapx/tree/1.5.50)
    
      - Improvement
          - APP Added logic to remove service worker and cache if there is not enough storage space in the browser. See issue \#441.

  - [1.5.48](https://github.com/unep-grid/mapx/tree/1.5.48)
    
      - Improvement
          - API
              - Added exposed header : content-length;
              - Set zip encoding as an option in sendJSON
          - APP
              - Attribute table modal: remove buttons if no data.
              - Jump to location at project change instead of fly to position;
              - Better performance and refactoring of the project list renderer;
              - Progress Radial : added animation frame support;
              - Merge pull request \#435 from antobenve/master : style instead of styles in WMS request
              - Added diaf score / summary in metadata window in addition to the full diaf table; added link to raster metadata; Remove the homepage link to source title: use distinct homepage link and list of download/source link; should solve feature requests from \#423
              - Added progress bar support in attributes table
      - Bug fixes
          - App
              - Solve issue where validation message did not work : login window, new view name, new project name, etc..

  - [1.5.47](https://github.com/unep-grid/mapx/tree/1.5.47)
    
      - Improvement
        
          - APP
            
              - Map Composer : new feature : change font size of current item; better resolution handling; various fixes;
              - Share manager : add auto start option for story map
              - Dashboard : add an option to ignore or not events that return no data or an empty array. Added callback arguments in widgets; Solved issues with dashboard modal window title;

  - [1.5.46](https://github.com/unep-grid/mapx/tree/1.5.46)
    
      - Improvement
          - APP
              - Map Composer : removed dependencies on medium-editor and interactjs use custom ones; Added new features to set page size, units and other settings.

  - [1.5.45](https://github.com/unep-grid/mapx/tree/1.5.45)
    
      - New feature
          - APP
              - Each view based on a vector source have now a button to display the full attribute table of the source. There is a filtering system by attribute that will also filter the displayed elements on the map. The table can be exported as CSV.

  - [1.5.44](https://github.com/unep-grid/mapx/tree/1.5.44)
    
      - New feature
          - APP
              - Map composer - early version. A module to compose a map based on currently visible views

  - [1.5.43](https://github.com/unep-grid/mapx/tree/1.5.43)
    
      - Bug fixes
          - APP
              - Solved issue with secondary attributes that were unselected during view edit.

  - [1.5.42](https://github.com/unep-grid/mapx/tree/1.5.42)
    
      - Improvement
          - APP
              - Added support for languages in forms validation + french translation
              - Allow GeoJSON view direct download
              - Full rebuild of modals
              - Added support for languages in color picker
              - Added support for languages in recovery system
              - Minor translation changes. See \#327.

  - [1.5.41](https://github.com/unep-grid/mapx/tree/1.5.41)
    
      - Improvement
          - APP
              - Story map :
                  - Editor translation in french
                  - Full rebuilt UI renderer
                  - Added tips section in editor
              - Style editor : support for style size by zoom ( point and lines )
          - APP/API
              - View metadata : faster, available using api, UI built client side.
              - Added support for SRS assignation for data upload should add support for DXF/CSV. See \#413;
              - Improved EPSG search module;
              - Removed \_mx\_valid column from attributes fields and schema, as requested in \#410
      - Bug fixes
          - APP
              - Story map : fix issue with external view as object instead of the expected view id string.
              - \#410 :
                  - Removed \_mx\_valid column from list attributes fields and schema in forms
                  - Fix legend filter not cumulative
      - Other :
          - APP
              - Removed loop optimisation. Loop optimizer have some issue when used in expression : the for loop was rebuilt outside scope;

  - [1.5.40.2](https://github.com/unep-grid/mapx/tree/1.5.40.2)
    
      - Improvement
          - APP/API
              - Starting code style validation using JSHint. See .jshintrc. This implies majors changes in all js, css, and html files. This will be a long incremential work.
          - APP
              - Dashboard button activate when there are widgets.
              - In draw mode, popup does not show anymore if clicked on a feature
      - Bug fixes
          - API
          - Issue with geometry validation: auto-correction / validation did not work due to typos and logic Separate json and xml utilities

  - [1.5.40.1](https://github.com/unep-grid/mapx/tree/1.5.40.1)
    
      - Bug fixes
          - API
              - Fix bug where overlap analysis produced an auto-correction
      - New features
          - APP
              - Draw tool. `mapbox-gl-draw`
              - Geojson view creation using resulting draw

  - [1.5.40](https://github.com/unep-grid/mapx/tree/1.5.40)
    
      - Improvement
          - APP
              - Unified methods to retrieve click based map query on MapX layers : one function is used for dashboard events, map popup event, for both raster and vector source
      - New features
          - APP
              - Raster views and custom code views have a dashboard functionality
              - The click event in dashboard is usable for querying raster sources.

  - [1.5.30](https://github.com/unep-grid/mapx/tree/bbb37f)
    
      - Improvement
          - API/APP
              - Create new source based on overlap analysis
              - Download authentication. Now, same method as upload and overlap, with encrypted token
              - Download and clip : validate beforehand instead of failing in ogr2ogr step
              - Color in logs
              - Download, uploads and overlap have an unified interface for logs
              - Logs autoscroll
              - Version in tools panel solved : index.html was not re-build when webpack build prod version
      - Bug fixes - Broken uploader

  - [1.5.29](https://github.com/unep-grid/mapx/tree/ce3d0d54c1)
    
      - Iprovement
          - APP
              - Batch screenshot creation
              - New layout for view description, should solve a bug in windows Chrome browser where legends were not rendered
              - Set application update as optional. At least, warn the user that an update is ready.
              - Better modal window
      - New features
          - API
              - Implemented precise area calculation of overlap between countries and selected layers.

  - [1.5.27](https://github.com/unep-grid/mapx/tree/5515f88ef71)
    
      - Improvement
          - APP
              - Better loading screen : higher z-index, block events when the app is busy, smooth transition back, when the loading is done
              - Support for attribut alias in metadata
              - Better tool for download pdf : cleaner, faster.
              - Trigger layer list when an upload is done
              - Meta data editor, now in two steps: no more wait on the first data editor to load
              - Layer management: hide linked source summary
              - Less waiting time when loading project list
              - Code refactoring : regroup reactive function by type. Should solve actions duplicate.
      - New feature
          - API
              - Method to get source metadata : “/get/souce/metadata:id”

  - [1.5.26](https://github.com/unep-grid/mapx/tree/11f89e4fea966169df9089d5c2ca15b301a575c5)
    
      - Improvement
          - APP
              - Update build process : use smaller chunks – issue with babel loader that produced huge chunks –; add promise polyfill, manually add manifest, minor changes;
          - API
              - Added new numeric parser to avoid bug in tiles where numeric was converted to string. This is related to style on numeric columns not correctly handled.

  - [1.5.25](https://github.com/unep-grid/mapx/tree/bba8abc110f67d7654a509099cc85a3f683b244e)
    
      - Improvement
          - APP
              - Upgrade all dependencies, fixes related issues
              - Upgrade build system to Webpack 4
              - Solve issues with translation rendering in metadata viewer

  - [1.5.24](https://github.com/unep-grid/mapx/tree/20067870e8cbaf11af66ddfba39f2612c439236c)
    
      - Improvement
          - APP : Testing session reconnection
          - APP : Instant estimate of overlap area
      - Bug fixing
          - APP : Overlap function in PixOp had issue with lines: the first coordinate of each line could have been omited.
          - APP : Changed the regular expression that “validate” email to a more strict one.

  - [1.5.23](https://github.com/unep-grid/mapx/tree/144d2a37bd30955c4ad8a3b5081db25b18625d97)
    
      - Improvement
          - APP : save and update query parameters: project, language, lat, lng, zoom.
      - Bug fixing
      - APP : Overlaps using pixop, numbers of layers to take in account did not unterstood “All layers”. Should be ok

  - [1.5.22](https://github.com/unep-grid/mapx/tree/9557502329e34b821f6c4df0e9aaf3bb1f12edaa)
    
      - Improvement
          - APP/API Let the user provide a projection system for download
          - APP : add basic option for highlight overlap tools
          - APP/API : new environment variable to store tokens and allowed user id as creator
          - APP : Add public view from public project in story maps available views

  - [1.5.21](https://github.com/unep-grid/mapx/tree/8ebeae87833c8447041669db0a45c6d77625319f)
    
      - Improvement
          - API : Set pre-simplification only for zoom \> 10 in postgres.
          - APP : Added new environment variables for handling mapbox token and allowed project creators

  - [1.5.20](https://github.com/unep-grid/mapx/tree/61b5592bdf2de9afb14a4bf1cf1713571e0ca0b1)
    
      - Improvement
          - Added an experimental tool to highlight potential overlaps between vector layers
      - Bug fixing
          - Story map bullets werent removed due to a DOM issue
          - Confidentiality issue : a publisher with edit access to a story map editor was able to list and use views from a private projects to which she had no access. This could still occurs if the view is purposely shared or imported as public view to another non-private project.

  - [1.5.19](https://github.com/unep-grid/mapx/tree/bc81b623ce09bc1359857c5e9cce00f8a1c24854)
    
      - Improvement
          - Added support for quering wms based raster source layer

  - [1.5.18](https://github.com/unep-grid/mapx/tree/caaee2e9be52711da3c0805da215140653661d59)
    
      - Improvement
          - Added support for download sources as CSV \#212
          - Added projection data when downloading geospatial files \#322
      - Bug fixing
          - Solved issue when images in legend where broken into multiple columns \#324
      - Rollback
          - Remove privilege to create new project for everyone. Only selected user can create new project.

  - [1.5.17](https://github.com/unep-grid/mapx/tree/d02a7ce3c3985fe8629efb324014871881b70c9a)
    
      - Improvement
          - Add current view count in filters by category
          - Style minor change in filter by labels and filter by attributes

  - [1.5.16](https://github.com/unep-grid/mapx/tree/7362a8457e76cea32dca9fb1367edfe78660736f)
    
      - Improvement
          - Modal Added four preset button for modal panel, added an option to resize panel horizontally.
          - Added autoprefixer for CSS in webpack config
      - Bug fixing
          - Dashboard modules could be ignored after a view edition. In case of only one module, the script automatically converted the value in a JSON string, and the dashboard was expecting an array. The `module` key in the `view.data.dashboard` can now be a string or an array. Or empty.

  - [1.5.15](https://github.com/unep-grid/mapx/tree/3c8d973fbb55a7c5d4fb57fb32b3eda2700c24ad)
    
      - Added translation support in filter views list by tags
      - Filter views by tags : use `AND` operator between filter types and `OR` within filter types.

  - [1.5.14](https://github.com/unep-grid/mapx/tree/c1e7616df923d9860264d79cc461dfa5b6d657d5)
    
      - Removed bug where (empty) private project could be seen when pressing a shared view’s “home” button
      - Added support for spanish. Thanks <span class="citation" data-cites="GianlucaGygax">@GianlucaGygax</span> \!
      - Updated service workers strategy. Using no-cache in traefik should solve issue where old cache were kept.
      - Modification on entry files for webpack to enable a viewer only mode for the app.

  - [1.5.13](https://github.com/unep-grid/mapx/tree/775e37f9d58f6f51df94bf890a19753f64d43e95)
    
      - Removed a bug where a dashboard was not removed if no source layer where used
      - Use pointer events instead of mouse event
      - Added a ‘minimize’ button in modal windows
      - Removed resize corner in modal windows – ( it’s not widely used and it produced a bug with flexbox )

  - [1.5.12](https://github.com/unep-grid/mapx/tree/0e8c7feae41290071b2fb728cd1ad369974868c0)
    
      - Solved an issue in view button when a zoom was applied in the browser: the nested circle was not well aligned producing a weird effect. Using SVG, the problem as been solved.
      - Update dependencies, see `app/package.json`
      - Changed the service worker generator to `workbox-webpack-plugin`
      - Solved \#277 where removal of a project did not remove releated views that does not had sources (raster, story, etc).

  - [1.5.11](https://github.com/unep-grid/mapx/tree/d509c639fc1be78e81405a978a63db1ff5b1d190)
    
      - Solved \#276
      - Solved \#274
      - Added a function to unregister service worker

  - [1.5.10](https://github.com/unep-grid/mapx/tree/4c36b899fd5887b21536703eed61ba4c22ebc07f)
    
      - New radial progress svg constructor
      - Direct local storage for views object, in addition to browser cache and service worker cache. Faster.
      - Bug fixes : label too long in map data properties query popup. Display the full thing on hover.
      - Code cleaning

  - [1.5.9](https://github.com/unep-grid/mapx/tree/d60a48cb841753e2578473a521b8d757cec6d5ff)
    
      - Improvement of road style : added more than 30 layers extracted and modified from style “Lè Shine” (https://frama.link/leshine),
      - Integrated simplified colors setting for roads, road border and building in style editor.

  - [1.5.8](https://github.com/unep-grid/mapx/tree/36fdfebac77231db028b358dd173e4ab9fd4ed7a)
    
      - Solved \#272 : the built date was wrong in the encrypted mail validation.

  - [1.5.7](https://github.com/unep-grid/mapx/tree/dfc4013b8b69f572794bc3d691eec366289809af)
    
      - Add service worker to cache assets and tiles,
      - Migrate language dict file to JSON, instead of csv, to be able to merge pull requests more easily,
      - Minor changes.

  - [1.5.6](https://github.com/unep-grid/mapx/tree/50b05b59d95b46ea3835b15d6ced9fc161d50455)
    
      - Updated version of R,
      - Added api upload for geojson stored client side,
      - Minor changes.

  - [1.5.5](https://github.com/unep-grid/mapx/tree/032f969f49e167aeb8af70dcc899a6fb8f34b169)
    
      - Added query parameter support to filter max role for view fetching : `?filterViewsByRoleMax=public` will show all public views only,
      - Added styling option for map labels : outline color.

  - [1.5.4](https://github.com/unep-grid/mapx/tree/62f76547809f342ad8c8a3b9c5f7a5ceba02c3ec)
    
      - Faster and more accurate view count without analyzing sequentially every project. It should counts shared views, external views, private views, public views and targeted views for every project of the current user.

  - [1.5.3](https://github.com/unep-grid/mapx/tree/05bd71f1c4bffa9b07e588a160770cb1c539cb84)
    
      - Added a new sharing option : any view can be imported as external, non-modifiable view in a project where the user is at least a publisher,
      - Removed www/ files from git repo : those are built with webpack, not useful to have them around.

  - [1.5.2](https://github.com/unep-grid/mapx/tree/34674b85a3c1d0b34979b40a5fbca8febc0783bd)
    
      - Fixed story map view selection \#255,
      - Fixed raster legend size : let the user click to expand the image into a modal,
      - Fixed legend label alignment,
      - Fixed long abstract \#253.

  - [1.5.1](https://github.com/unep-grid/mapx/tree/81596c1b7c6ff64740662067ae41080fccf78788)
    
      - Solved bug where user was not able to authenticate when uploading an image,
      - Better legend and description of view content, using multi-column layout.

  - [1.5.0](https://github.com/unep-grid/mapx/tree/2e8249a3142d5f9be01dfd0e5afd4b414ab336f4)
    
      - Refactoring,
      - Manage by project. It’s now possible to manage your data by project, in addition to collections and classes,
      - Using docker for the whole stack,
      - Merged app and api under the same repository.
