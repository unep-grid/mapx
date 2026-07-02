/**
 * Table edit protocol events, server side.
 * Client counterpart : app/src/js/source/edit/channel.js
 */
export const events = {
  /**
   * from client
   */
  client_edit_updates: "/client/source/edit/table/update",
  client_exit: "/client/source/edit/table/exit",
  client_geom_validate: "/client/source/edit/table/geom/validate",
  client_value_validate: "/client/source/edit/table/value/validate",
  client_changes_sanitize: "/client/source/edit/table/changes/sanitize",
  client_lock_refresh: "/client/source/edit/table/lock/refresh",
  client_get: "/client/get",
  /**
   * from server
   */
  server_joined: "/server/source/edit/table/joined",
  server_error: "/server/source/edit/table/error",
  server_new_member: "/server/source/edit/table/new_member",
  server_member_exit: "/server/source/edit/table/member_exit",
  server_table_data: "/server/source/edit/table/data",
  server_dispatch: "/server/source/edit/table/dispatch",
  server_progress: "/server/source/edit/table/progress",
  /**
   * server broadcast / spread : all clients, not only edit sessions
   */
  server_spread_views_update: "/server/spread/views/update",
  server_spread_join_editor_update: "/server/spread/join_editor/update",
};
