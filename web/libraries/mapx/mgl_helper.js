/**
 * Generate a random string of the given length
 * @param {integer} n Number of character
 * @return {string} random string
 */
function randomString(n) {
    var result = "";
    if (!n) n = 5;
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < n; i++)
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    return result;
}
/**
 * Generate a random hsla color string, with fixed saturation and lightness
 * @param {number} opacity opacity from 0 to 1
 * @param {number} random value from 0 to 1
 * @param {number} saturation from 0 to 100
 * @param {number} lightness from 0 to 100
 */
function randomHsl(opacity, random, saturation, lightness) {
    if (!opacity) opacity = 1;
    if (!saturation) saturation = 100;
    if (!lightness) lightness = 50;
    if (!random) random = Math.random();
    res = "hsla(" + (random * 360) +
        ", " + saturation + "% " +
        ", " + lightness + "% " +
        ", " + opacity + ")";
    return res;
}



