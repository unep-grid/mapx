export async function loadTest(url, n) {
  const res = [];
  const err = [];

  for (let i = 0; i < n; i++) {
    try {
      const start = Date.now();
      const r = await fetch(url);
      if (!r.ok) {
        throw 'failed';
      } else {
        await r.blob();
        res.push(Date.now() - start);
      }
    } catch (e) {
      err.push(e);
    }
  }
  const n1 = res.length;
  res.sort((a, b) => a - b);
  const max = Math.max(...res);
  const min = Math.min(...res);
  const median = res[Math.floor(n1 / 2)];
  const mean = res.reduce((a, c) => a + c, 0) / n1;

  return {
    res,
    err,
    max,
    min,
    median,
    mean,
    url
  };
}
