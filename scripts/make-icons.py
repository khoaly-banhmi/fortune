"""Builds the favicon SVGs from frame 1 (the resting cookie) on the site's red.
Drops the fine detail that vanishes at 16px and thickens the outlines. Run scripts/make-icons.sh to also make PNGs."""
import re

src = open("assets/cookie/frame-01.svg").read()

clip = re.search(r'<clipPath id="f1c">.*?</clipPath>', src, re.S).group(0)
body = re.search(r'<g id="cookie">.*?(?=\n\n<g id="crumbs">)', src, re.S).group(0)
body = re.sub(r'<g stroke="#C38B34" stroke-width="1" stroke-opacity="0.7">.*?</g>', '', body, flags=re.S)   # thin detail
body = re.sub(r'<g fill="#C38B34" fill-opacity="0.7">.*?</g>', '', body, flags=re.S)                         # speckles
body = body.replace('stroke-width="1.5"', 'stroke-width="5"').replace('stroke-width="2"', 'stroke-width="5"')

# Cookie spans x 207-437, y 315-552 (centre 322.5, 433.5). Square crop around it; the cookie fills ~70% of the icon.
SIZE = 338
X, Y = 322.5 - SIZE / 2, 433.5 - SIZE / 2
VB = f"{X:g} {Y:g} {SIZE} {SIZE}"

def svg(radius):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}" fill="none" stroke-linecap="round" stroke-linejoin="round">
<defs>
<radialGradient id="bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#c0392b"/><stop offset="1" stop-color="#8f241b"/></radialGradient>
{clip}
</defs>
<rect x="{X:g}" y="{Y:g}" width="{SIZE}" height="{SIZE}" rx="{radius}" fill="url(#bg)"/>
{body}
</svg>
'''

open("assets/favicon.svg", "w").write(svg(74))        # rounded, for browser tabs
open("scripts/icon-square.svg", "w").write(svg(0))    # full-bleed, for iOS (it applies its own rounding)
print("favicon.svg", len(svg(74)), "bytes")
