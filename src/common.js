/* ===================== shared: palette, bitmap font ===================== */
// Night-teal + ember-orange palette (inspired by the 3D-pixel reference): cool shadows, warm emissive light
const PALETTE = [
  "#07090f","#0c111c","#121a29","#182337","#1f2f45","#283d55","#344e66","#426276","#557887","#6e9198","#8fadaa","#b6cbc0","#dfe6d6",
  "#1c0f0c","#2e1712","#452017","#61291a","#82341c","#a6441f","#c95a24","#e2762d","#f2973c","#fbb954","#ffd678","#fff0b0",
  "#4a1420","#7a1f2a","#b02e33","#e04a3c",
  "#142a24","#1f4232","#2f5e3e","#4a7f48","#7aa35a",
  "#241a33","#3a2850","#5c3f72","#8a62a0",
  "#b8775a","#dba07a","#f0c9a0",
  "#3d3f4a","#6a6c78","#a2a3ac","#f4f2ea"
];
const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const PAL_RGB = PALETTE.map(hex2rgb);

// 3x5 bitmap font
const FONT = {
  "0":"111101101101111","1":"010110010010111","2":"111001111100111","3":"111001111001111","4":"101101111001001",
  "5":"111100111001111","6":"111100111101111","7":"111001010010010","8":"111101111101111","9":"111101111001111",
  "+":"000010111010000","-":"000000111000000","!":"010010010000010","?":"111001011000010",".":"000000000000010",":":"000010000010000","/":"001001010100100",
  "A":"010101111101101","B":"110101110101110","C":"011100100100011","D":"110101101101110","E":"111100110100111","F":"111100110100100",
  "G":"011100101101011","H":"101101111101101","I":"111010010010111","K":"101110100110101","L":"100100100100111","M":"101111111101101",
  "N":"110101101101101","O":"010101101101010","P":"110101110100100","R":"110101110101101","S":"011100010001110","T":"111010010010010",
  "U":"101101101101111","V":"101101101101010","W":"101101111111101","X":"101101010101101","Y":"101101010010010"," ":"000000000000000"
};
function textWidth(str, s=1){ return str.length ? (str.length*4-1)*s : 0; }
// draw into a 2D canvas context with fillRect (crisp)
function ctxText(c, str, x, y, s, col, rot){
  c.save(); c.fillStyle = col; c.translate(x, y); if (rot) c.rotate(rot);
  const w = textWidth(str, s); let cx = -w/2;
  for (const ch of str){ const g = FONT[ch] || FONT["?"]; for (let i=0;i<15;i++) if (g[i]==="1") c.fillRect(cx + (i%3)*s, -2.5*s + Math.floor(i/3)*s, s, s); cx += 4*s; }
  c.restore();
}
const REDUCED = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
