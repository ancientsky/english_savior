#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient(width, height, colors):
    """Create a gradient image"""
    base = Image.new('RGB', (width, height), colors[0])
    draw = ImageDraw.Draw(base)

    # Create vertical gradient
    for i in range(height):
        # Interpolate between colors
        ratio = i / height
        if ratio < 0.5:
            # First half: color 0 to color 1
            r1, g1, b1 = colors[0]
            r2, g2, b2 = colors[1]
            local_ratio = ratio * 2
        else:
            # Second half: color 1 to color 2
            r1, g1, b1 = colors[1]
            r2, g2, b2 = colors[2]
            local_ratio = (ratio - 0.5) * 2

        r = int(r1 + (r2 - r1) * local_ratio)
        g = int(g1 + (g2 - g1) * local_ratio)
        b = int(b1 + (b2 - b1) * local_ratio)

        draw.line([(0, i), (width, i)], fill=(r, g, b))

    return base

def generate_og_image():
    """Generate OG Image (1200x630px)"""
    print("Generating og-image.png (1200x630px)...")

    # Colors from the theme
    color1 = (233, 69, 96)   # #e94560
    color2 = (15, 52, 96)    # #0f3460
    color3 = (22, 33, 62)    # #16213e

    # Create gradient background
    img = create_gradient(1200, 630, [color1, color2, color3])
    draw = ImageDraw.Draw(img)

    # Add geometric pattern
    for i in range(20):
        x = i * 60
        y = i * 30
        draw.rectangle([x, y, x + 100, y + 100], outline=(255, 255, 255, 25), width=2)

    # Try to use default font
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        emoji_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 60)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
        tag_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        emoji_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()

    # Title - English Savior
    text = "English Savior"
    bbox = draw.textbbox((0, 0), text, font=title_font)
    text_width = bbox[2] - bbox[0]
    draw.text((600 - text_width/2, 150), text, fill=(255, 255, 255), font=title_font)

    # Subtitle - 英語救星
    text = "英語救星"
    bbox = draw.textbbox((0, 0), text, font=subtitle_font)
    text_width = bbox[2] - bbox[0]
    draw.text((600 - text_width/2, 240), text, fill=(255, 255, 255), font=subtitle_font)

    # Emojis
    text = "⛏️ 🏃 📺"
    bbox = draw.textbbox((0, 0), text, font=emoji_font)
    text_width = bbox[2] - bbox[0]
    draw.text((600 - text_width/2, 330), text, fill=(255, 255, 255), font=emoji_font)

    # Description
    text = "在遊戲世界中成為英語大師！"
    bbox = draw.textbbox((0, 0), text, font=desc_font)
    text_width = bbox[2] - bbox[0]
    draw.text((600 - text_width/2, 450), text, fill=(255, 211, 105), font=desc_font)

    # Tagline
    text = "Minecraft × Roblox × YouTube"
    bbox = draw.textbbox((0, 0), text, font=tag_font)
    text_width = bbox[2] - bbox[0]
    draw.text((600 - text_width/2, 530), text, fill=(255, 255, 255), font=tag_font)

    img.save('og-image.png')
    print("✓ Generated og-image.png")

def generate_favicon():
    """Generate Favicon (32x32px)"""
    print("Generating favicon.png (32x32px)...")

    # Create base image
    img = Image.new('RGB', (32, 32), (233, 69, 96))
    draw = ImageDraw.Draw(img)

    # Gradient effect
    for i in range(32):
        ratio = i / 32
        r = int(233 - (233 - 15) * ratio)
        g = int(69 - (69 - 52) * ratio)
        b = int(96)
        draw.line([(0, i), (32, i)], fill=(r, g, b))

    # Border
    draw.rectangle([1, 1, 30, 30], outline=(255, 211, 105), width=2)

    # Letter "E"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except:
        font = ImageFont.load_default()

    text = "E"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    draw.text((16 - text_width/2, 16 - text_height/2 - 2), text, fill=(255, 255, 255), font=font)

    img.save('favicon.png')
    print("✓ Generated favicon.png")

def generate_apple_touch_icon():
    """Generate Apple Touch Icon (180x180px)"""
    print("Generating apple-touch-icon.png (180x180px)...")

    # Colors
    color1 = (233, 69, 96)
    color2 = (15, 52, 96)
    color3 = (22, 33, 62)

    # Create gradient
    img = create_gradient(180, 180, [color1, color2, color3])
    draw = ImageDraw.Draw(img)

    # Add pattern
    for i in range(6):
        x = i * 30
        y = i * 30
        draw.rectangle([x, y, x + 60, y + 60], outline=(255, 255, 255, 40), width=2)

    # Border
    draw.rectangle([2, 2, 177, 177], outline=(255, 211, 105), width=4)

    # Shield background
    shield_points = [
        (90, 40), (130, 60), (130, 110), (90, 140), (50, 110), (50, 60)
    ]
    draw.polygon(shield_points, fill=(255, 255, 255, 30))

    # Letter "E"
    try:
        font_e = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_emoji = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        font_e = ImageFont.load_default()
        font_emoji = ImageFont.load_default()

    text = "E"
    bbox = draw.textbbox((0, 0), text, font=font_e)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    draw.text((90 - text_width/2, 75 - text_height/2), text, fill=(255, 255, 255), font=font_e)

    # Small emoji
    text = "⚔️"
    bbox = draw.textbbox((0, 0), text, font=font_emoji)
    text_width = bbox[2] - bbox[0]
    draw.text((90 - text_width/2, 125), text, fill=(255, 255, 255), font=font_emoji)

    img.save('apple-touch-icon.png')
    print("✓ Generated apple-touch-icon.png")

def main():
    print("=" * 50)
    print("English Savior - Image Generator")
    print("=" * 50)
    print()

    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    generate_og_image()
    generate_favicon()
    generate_apple_touch_icon()

    print()
    print("=" * 50)
    print("✓ All images generated successfully!")
    print("=" * 50)

if __name__ == "__main__":
    main()
