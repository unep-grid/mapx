import {readJSON} from '#mapx/helpers';

/* JSON schema for client logs */
export const apiLogs = await readJSON('./api_logs.json', import.meta.url);

