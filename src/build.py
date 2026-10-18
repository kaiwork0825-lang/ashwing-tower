# Builds ../index.html (the public GitHub Pages game) from the sources in this folder.
import os
here = os.path.dirname(os.path.abspath(__file__)); R = lambda f: open(os.path.join(here, f), encoding="utf-8").read()
game = R("game.js"); mark = "/* ================= BOOT ================= */"
assert mark in game
game = game.replace(mark, R("world.js") + "\n" + R("walk.js") + "\n" + R("net.js") + "\n" + mark)
js = "\n".join([R(f) for f in ["common.js", "dice3d.js", "pixel.js", "audio.js"]] + [game])
pub_js = R("p2p.js") + "\n" + js
pub = R("page.html").replace("__CURSOR__", R("cursor.b64")).replace("<!--SCRIPTS-->",
  '<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>\n<script>\n' + pub_js + "\n</script>")
pub = ('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
       '<meta property="og:title" content="잿날개의 탑"><meta property="og:description" content="친구와 함께하는 픽셀 D20 TRPG">'
       '<style>html,body{margin:0}</style></head><body>' + pub + "</body></html>")
open(os.path.join(here, "..", "index.html"), "w", encoding="utf-8").write(pub)
print("built index.html", len(pub))
