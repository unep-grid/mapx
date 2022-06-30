import { ioSendJobClient } from "./job_client.js";

/**
 * Send a job to the client, handled in ws_handler 'job_test_sum' and
 * return the result as an output of the request
 */
export async function ioGetTestJobSum(socket, request) {
  const response = await ioSendJobClient(socket, "job_sum", {
    arrayNum: request.input.arrayNum,
  });
  request.output = response.output;
  socket.emit("response", request);
}

/**
 * Send a job to the client, handled in ws_handler 'job_test_echo' and
 * return the result as an output of the request
 */
export async function ioGetTestJobEcho(socket, request) {
  const response = await ioSendJobClient(socket, "job_echo", {
    now: request.input.now,
  });
  request.output = response.output;
  socket.emit("response", request);
}
