function mwIoWrapSession(mw) {
  return (socket, next) => {
    console.log(`Connect socket ${socket.id} to session`);
    return mw(socket.request, {}, next);
  };
}

export function ioCreateSessionMw(mwSession) {
  return mwIoWrapSession(mwSession);
}
