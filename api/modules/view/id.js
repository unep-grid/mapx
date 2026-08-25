import { randomInt } from "node:crypto";

const ID_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomGroup() {
  return Array.from(
    { length: 5 },
    () => ID_CHARACTERS[randomInt(ID_CHARACTERS.length)],
  ).join("");
}

/** Generate a MapX view identifier without assuming a storage backend. */
export function newIdView() {
  return `MX-${randomGroup()}-${randomGroup()}-${randomGroup()}`;
}
