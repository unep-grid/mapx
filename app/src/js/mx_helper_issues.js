export function handleIssues(err) {
  const h = mx.helpers;

  /**
  * mapx error, standard error, map error, promise errors
  */ 
  let msg =
    h.path(err, 'msg') ||
    h.path(err, 'message') ||
    h.path(err, 'error.message') ||
    h.path(err, 'reason.message') ||
    h.path(err, 'reason') ||
    'Error undefined, check the console';

  const src = h.path(err, 'sourceId');

  if (src) {
    msg = `${msg} (source:${src} )`;
  }

  console.error(msg);
}
