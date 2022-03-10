import {getApiUrl} from './api_routes';
import {fetchJsonProgress} from './mx_helper_fetch_progress.js';
let start;

export async function fetchProjects(opt) {
  start = performance.now();

  const defaults = {
    idUser: mx.settings.user.id,
    language: mx.settings.language,
    role: 'any',
    title: null,
    titlePrefix: null,
    titleFuzzy: null,
    token: mx.settings.user.token,
    onProgress: () => {},
    onError: console.error,
    onComplete: onComplete
  };

  opt = Object.assign({}, defaults, opt);

  const url = new URL(getApiUrl('getProjectsListByUser'));

  const qp = [
    'idUser',
    'token',
    'role',
    'language',
    'titlePrefix',
    'titleFuzzy'
  ];
 
  for (const s of qp) {
    url.searchParams.set(s, opt[s] || "");
  }

  const data = await fetchJsonProgress(url, {
    onProgress: opt.onProgress,
    onError: opt.onError,
    onComplete: opt.onComplete
  });

  if (data.type === 'error') {
    throw new Error(data.message);
  }

  return data || data;
}

function onComplete() {
  const duration = Math.round(performance.now() - start);
  console.log(`Project fetch + DB: ${duration} [ms]`);
}
