## MapX : change log

- 0.5.4
  - Faster and more accurate view count without analyzing sequentially every project. It should counts shared views, external views, private views, public views and targeted views for every project of the current user
- 0.5.3
  - Added a new sharing option : any view can be imported as external, non-modifiable view in a project where the user is at least a publisher.
  - Removed www/ files from git repo : those are built with webpack, not useful to have them around 
- 0.5.2
  - Fixed story map view selection #255
  - Fixed raster legend size : let the user click to expand the image into a modal,
  - Fixed legend label alignment.
  - Fixed long abstract #253.
- 0.5.1 
  - Solved bug where user was not able to authenticate when uploading an image,
  - Better legend and description of view content, using multi-column layout.
- 0.5.0 
  - Refactoring,
  - Manage by project. It's now possible to manage your data by project, in addition to collections and classes, 
  - Using docker for the whole stack,
  - Merged app and api under the same repository.
