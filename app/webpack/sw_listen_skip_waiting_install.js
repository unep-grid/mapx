const debug = !!0;

self.addEventListener("message", (event) => {
  console.log("SW-LOG Message", event.data);
  if (event.data === "mx_install") {
    console.log("SW-LOG skip waiting");
    self.skipWaiting();
  }
});

self.addEventListener("install", () => {
  console.log("SW-LOG Install");
});

self.addEventListener("activate", () => {
  console.log("SW-LOG Activate");
});

self.addEventListener("waiting", () => {
  console.log("SW-LOG waiting");
});

self.addEventListener("redundant", () => {
  console.log("SW-LOG redundant");
});

if (debug) {
  self.addEventListener("fetch", (event) => {
    console.log(" SW-LOG Fetching:", event.request.url);
  });
}
