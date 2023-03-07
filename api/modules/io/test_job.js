/**
 * Test event chain :
 * client -> trigger this ↓ -> client request -> response -> reply result
 */
export async function ioTestSum(socket, request, cb) {
  const response = await socket.mx_emit_ws_response(
    "/server/test/sum",
    request
  );
  cb(response);
}

/**
 * Send a job to the client, handled in ws_handler 'job_test_echo' and
 * return the result as an output of the request
 */
export async function ioTestEcho(socket, request, cb) {
  const response = await socket.mx_emit_ws_response(
    "/server/test/echo",
    request
  );
  cb(response);
}
