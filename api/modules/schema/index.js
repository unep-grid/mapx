import { readFile } from 'fs/promises';
const apiLogs = JSON.parse(
  await readFile(
    new URL('./api_logs.json', import.meta.url)
  )
);

export {apiLogs};
