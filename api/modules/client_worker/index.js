import { randomString } from "#mapx/helpers";
import { isArray, isFunction } from "@fxi/mx_valid";

export const mwClientWorker = (io) => {
  return (req, res, next) => {
    const idSocket = req.body ? req.body.idSocket : req.query.idSocket;

    /**
     * Emit job request
     *
     */
    res.clientJobRequest = async (id_resolver, data) => {
      const sockets = await io.in(idSocket).fetchSockets();

      const valid =
        isArray(sockets) && sockets.length > 0 && isFunction(sockets[0].once);

      if (!valid) {
        throw new Error(`No sockets for ${idSocket}`);
      }

      const socket = sockets[0];

      return new Promise((resolve, reject) => {
        const idJob = randomString("job_");
        /*
         * Job done, result handling
         */
        socket.once(idJob, handler);

        /**
         * Send the job
         */
        io.to(idSocket).emit("job_request", {
          id: idJob,
          id_resolver: id_resolver,
          data: data,
        });

        /**
         * Generic handler
         */
        function handler(data) {
          if (data?.type === "error") {
            reject(data.message);
          }
          resolve(data);
        }
      });
    };
    next();
  };
};
