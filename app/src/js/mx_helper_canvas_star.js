import { createCanvas } from "./mx_helper_canvas";


/**
 *  create a star on a canvas
 *  @param {Number} options.diameter Diameter
 *  @param {Number} options.nBranch Number of branch
 *  @param {Number} options.inlet Star inner circle ratio
 *  @param {Number} options.progress Progress
 *  @param {Number} options.threshod Thresold
 *  @param {String} options.color1 Color before threshold
 *  @param {String} options.color2 Color after threshold
 *
 */
export function elStrokeStar(c) {
  var elCanvas = createCanvas(c.diameter, c.diameter);
  var ctx = elCanvas.getContext("2d");
  var color = c.progress <= c.threshold ? c.color1 : c.color2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  star(ctx, c.diameter / 2, c.nBranch, c.inlet, true);
  ctx.globalCompositeOperation = "destination-out";
  square(ctx, c.diameter, c.progress);
  ctx.globalCompositeOperation = "source-over";
  star(ctx, c.diameter / 2, c.nBranch, c.inlet, false);
  return elCanvas;
}

function star(ctx, r, n, inlet, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(r, r);
  ctx.moveTo(0, 0 - r);
  for (var i = 0; i < n; i++) {
    ctx.rotate(Math.PI / n);
    ctx.lineTo(0, 0 - r * inlet);
    ctx.rotate(Math.PI / n);
    ctx.lineTo(0, 0 - r);
  }
  ctx.closePath();
  ctx.stroke();
  if (fill) {
    ctx.fill();
  }
  ctx.restore();
}

function square(ctx, d, p) {
  ctx.moveTo(0, 0);
  ctx.fillRect(0, 0, d - d * p, d);
}
