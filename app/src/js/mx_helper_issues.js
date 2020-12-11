export function handleIssues(err) {
  const idGroup = mx.helpers.makeId();
  const h = mx.helpers;

  // mapx error, standard error, map error, promise errors
  var msg =
    h.path(err, 'msg') ||
    h.path(err, 'message') ||
    h.path(err, 'error.message') ||
    h.path(err, 'reason.message') ||
    h.path(err, 'reason') ||
    'Error undefined, check the console';

  var src = h.path(err, 'sourceId');

  if (src) {
    msg = `${msg} (source:${src} )`;
  }
  if (h.path(mx, 'settings.user.roles.admin')) {
    mx.nc.notify({
      idGroup: idGroup,
      type: 'info',
      level: 'error',
      msg: msg,
      timestamp: Date.now() * 1
    });
  } else {
    console.error(msg);
  }
}
