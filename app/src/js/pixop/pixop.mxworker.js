const w = self;

w.onmessage = handleMessages;

async function handleMessages(m) {
  const d = m.data;
  let width, height, ctx;
  /**
   * If init, clone canvas
   */
  if (d.type === "init") {
    w.canvas = d.canvas;
    return;
  }

  if (d.type === "set_size") {
    w.dpr = d.dpr || 1;
    w.canvas.width = d.width * w.dpr;
    w.canvas.height = d.height * w.dpr;
    return;
  }

  if (d.type === "clear" || d.type === "render") {
    width = w.canvas.width;
    height = w.canvas.height;
    ctx = canvas.getContext("2d");
  }

  /**
   * Clear
   */
  if (d.type === "clear") {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  /**
   * Render spotlight
   */
  if (d.type === "render") {
    const start = performance.now();
    /**
     * init local vars
     */
    let x, y, k, j;
    let hasOverlap = false;
    let count = 0;
    let countAll = 0;
    const nLayers = d.store.length;
    const nPix = height * width;
    const points = [];

    if (d.mode === "spotlight") {
      /**
       * local
       */
      const imgBuffer = await createImageBitmap(d.buffer);

      /**
       * clear
       */
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "destination-out";

      /**
       * Find overlap and draw buffer
       */
      for (x = 0; x < width; x++) {
        for (y = 0; y < height; y++) {
          k = (y * width + x) * 4;
          count = 0;
          hasOverlap = false;
          for (j = 0; j < nLayers; j++) {
            if (!hasOverlap) {
              if (d.store[j][k + 3] > d.threshold) {
                count++;
              }
              if (count >= d.nLayersOverlap) {
                hasOverlap = true;
                countAll += count;
                if (d.calcArea) {
                  points.push([x, y]);
                }

                ctx.drawImage(
                  imgBuffer,
                  x / w.dpr - d.radius,
                  y / w.dpr - d.radius
                );
              }
            }
          }
        }

        if (x % 50 === 0) {
          w.postMessage({
            type: "progress",
            progress: x / width,
          });
        } else if (x === width - 1) {
          w.postMessage({
            type: "progress",
            progress: 1,
          });
        }
      }
    }

    if (d.mode === "plain") {
      /**
       * Context data
       */
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
          p = k = (y * width + x) * 4;
          count = 0;

          for (j = 0; j < nLayers; j++) {
            if (d.store[j][k + 3] > d.threshold) {
              count++;
            }
          }
          if (count >= d.nLayersOverlap) {
            data[k] = 255;
            data[k + 1] = 0;
            data[k + 2] = 0;
            data[k + 3] = 255;
            countAll += count;
            if (d.calcArea) {
              points.push([x, y]);
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0, 0, 0, width, height);
    }

    /**
     * Results
     */
    w.postMessage({
      type: "result",
      mode: d.mode,
      calcArea: d.calcArea,
      points: points,
      nPixelTotal: nPix,
      nPixelFound: countAll,
      timing: performance.now() - start,
    });

  }
}
