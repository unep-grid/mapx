import {spawn} from 'child_process';
/**
 * Spawn async wrapper
 * Modified from https://github.com/mgenware/promised-spawn
 */
const def = {
  onStdout: null,
  onStderr: null,
  exit: null,
  maxError: 20
};

export {asyncSpawn};

function asyncSpawn(args, options) {
  options = {
    ...def,
    ...options
  };
  return new Promise((resolve, reject) => {
    const process = spawn.apply(undefined, args);
    process.stdout.on('data', (data) => {
      if (options.onStdout) {
        try {
          options.onStdout(data);
        } catch (e) {
          reject(e);
        }
      }
    });

    let nError = 0;
    process.stderr.on('data', (data) => {
      if (nError++ >= options.maxError) {
        return;
      }
      if (options.onStderr) {
        try {
          options.onStderr(data);
        } catch (e) {
          reject(e);
        }
      }
    });

    process.on('close', (code) => {
      if (code === 0 || code === '0') {
        resolve(0);
      } else {
        const error = Error(`Process exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });
  });
}
