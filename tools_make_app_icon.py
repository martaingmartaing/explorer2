from PIL import Image, ImageDraw, ImageFont

S = 160
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

BLACK = (0, 0, 0, 255)
SILVER = (192, 192, 192, 255)
WHITE = (255, 255, 255, 255)
NAVY = (0, 0, 128, 255)

# --- Fenêtre ---
d.rectangle([10, 8, 150, 128], fill=SILVER, outline=BLACK, width=3)
# barre de titre
d.rectangle([13, 11, 147, 30], fill=NAVY, outline=BLACK, width=2)
# bouton fermer
d.rectangle([131, 14, 145, 27], fill=SILVER, outline=BLACK, width=2)
d.line([134, 17, 142, 24], fill=BLACK, width=2)
d.line([142, 17, 134, 24], fill=BLACK, width=2)

# --- Pomme ---
# corps
d.ellipse([46, 42, 106, 112], fill=(204, 0, 0, 255), outline=BLACK, width=3)
# reflet
d.ellipse([58, 52, 72, 70], fill=(255, 120, 120, 255))
# feuille
d.polygon([(78, 44), (86, 30), (100, 34), (92, 46)], fill=(0, 160, 0, 255), outline=BLACK)
# tige
d.line([78, 48, 76, 34], fill=BLACK, width=3)

# rayures arc-en-ciel (bandes horizontales)
stripes = [
    (40, 72, (0, 170, 0, 255)),    # vert
    (48, 80, (255, 220, 0, 255)),  # jaune
    (56, 88, (255, 140, 0, 255)),  # orange
    (64, 96, (220, 0, 0, 255)),    # rouge
    (72, 104, (0, 90, 200, 255)),  # bleu
]
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).ellipse([49, 45, 103, 109], fill=255)
for y0, y1, col in stripes:
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([40, y0, 112, y1], fill=col)
    img.paste(layer, (0, 0), Image.composite(mask, Image.new("L", (S, S), 0), layer.split()[3]))
# contour de la pomme par-dessus
d.ellipse([46, 42, 106, 112], outline=BLACK, width=3)

# --- Étiquette .APP ---
d.rectangle([86, 96, 156, 144], fill=SILVER, outline=BLACK, width=3)
# ombre/relief Win98
d.line([88, 98, 152, 98], fill=WHITE, width=2)
d.line([88, 98, 88, 140], fill=WHITE, width=2)
d.line([88, 141, 153, 141], fill=(64, 64, 64, 255), width=2)
d.line([153, 100, 153, 141], fill=(64, 64, 64, 255), width=2)

try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
except Exception:
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
    except Exception:
        font = ImageFont.load_default()

text = ".APP"
bbox = d.textbbox((0, 0), text, font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = 90 + (58 - tw) // 2
ty = 100 + (34 - th) // 2 - bbox[1]
d.text((tx, ty), text, font=font, fill=BLACK)

img.save("static/icons/win98/file_app.png")
print("saved static/icons/win98/file_app.png", img.size)
