export function ioEcho(socket, data) {
  socket.emit("echo", data);
}
