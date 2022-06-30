//import { clientRedis, clientRedisAlt } from "#mapx/db";
import { randomString } from "#mapx/helpers";
export { ioSendJobClient };

/**
 * Launch async ws process on client, from server,
 * during an http request
 *
 */
function ioSendJobClient(socket, idResolver, data) {
  const idJob = randomString(`job_${idResolver}`);
  const timeout = 1e3 * 60; //1 minute

  return new Promise((resolve, reject) => {
    /**
     * Reject if timeout
     */
    setTimeout(() => {
      clear();
      reject(`Job ${idJob} timeout after ${timeout / 1e3} seconds`);
    }, timeout);

    /*
     * Job done, result handling
     */
    socket.on("job_result", handler);

    /**
     * Send the job
     */
    socket.emit("job_request", {
      id: idJob,
      id_resolver: idResolver,
      input: data,
    });

    /**
     * Generic handler
     */
    function handler(result) {
      if(result?.id !== idJob){
        return;
      }
      clear();
      if (result?.error) {
        reject(result.error);
      } else {
        resolve(result);
      }
    }

    function clear() {
      socket.off(idJob, handler);
    }
  });
}
