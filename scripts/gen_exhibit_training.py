import urllib.parse
import urllib.request
import os
from PIL import Image

PROMPT = (
    "Use case: a single exhibit illustration for a cozy browser card game. "
    "Match the flat line-art of the approved goose: warm ivory ground, "
    "one consistent warm-brown outline, flat fills, no texture. "
    "Subject: one leaf-shaped paper badge. Paper fill #F7F1E0. "
    "A short stem in #A0A078. On the badge, exactly one wobbly hand-drawn circle "
    "and one tiny solid dot inside that circle. No hole, string, ribbon, or engraved lettering. "
    "Style: gently rounded outlines and the inner drawing in #807050, consistent medium weight, "
    "flat solid fills. No paper grain, hatching, gradients, realistic shading, cast shadow, or 3D. "
    "Background is a uniform #FBF4E7 with no vignette. "
    "Composition: one badge centered, about 60 percent of the image height, blank margins, "
    "nothing cropped. No goose, bird, person, text, letters, numbers, logo, watermark, border, or scenery."
)

TARGET = "assets/concepts/exhibit-training.png"
os.makedirs(os.path.dirname(TARGET), exist_ok=True)

encoded = urllib.parse.quote(PROMPT)
url = (
    "https://image.pollinations.ai/prompt/{prompt}"
    "?nologo=true&model=flux&width=1024&height=1024&seed=42"
).format(prompt=encoded)

print(f"Downloading from Pollinations (flux, 1024x1024, seed=42)...")
try:
    urllib.request.urlretrieve(url, TARGET)
except Exception as e:
    print(f"Download failed: {e}")
    raise SystemExit(1)

size = os.path.getsize(TARGET)
print(f"Saved {TARGET} ({size} bytes)")

img = Image.open(TARGET)
print(f"Mode={img.mode}, Size={img.size}")
if img.size != (1024, 1024):
    print("WARNING: size is not 1024x1024")

img = img.convert("RGB")
px = img.load()
w, h = img.size

# Corner samples (should be background #FBF4E7 ~ (251,244,231))
corners = {(0,0), (w-1,0), (0,h-1), (w-1,h-1), (w//2, h//2)}
print("Sample pixels:")
for x,y in sorted(corners):
    print(f"  ({x},{y}) = {px[x,y]}")

# Rough color presence check
targets = {
    "paper": (247, 241, 224),   # #F7F1E0
    "stem": (160, 160, 120),    # #A0A078
    "outline": (128, 112, 80),  # #807050
    "bg": (251, 244, 231),      # #FBF4E7
}

def near(a, b, tol=18):
    return all(abs(a[i]-b[i]) <= tol for i in range(3))

found = set()
step = max(1, w//64)
for x in range(0, w, step):
    for y in range(0, h, step):
        c = px[x,y]
        for name, ref in targets.items():
            if near(c, ref):
                found.add(name)

print("Colors found:", sorted(found))

# White pixel ratio (white border watermark check)
white = sum(1 for x in range(w) for y in range(h) if px[x,y] == (255,255,255))
print(f"Pure white pixels: {white} / {w*h}")
if white > 500:
    print("WARNING: many pure-white pixels (possible white border/watermark)")

print("DONE")
