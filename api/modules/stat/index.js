/**
 * @param {Array} array of numeric value
 * @return {Number} stdev
 */
export function standardDeviation(arr) {
  // Find the mean of the array
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;

  // Find the variance of the array
  const variance =
    arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;

  // Return the square root of the variance to get the standard deviation
  return Math.sqrt(variance);
}
