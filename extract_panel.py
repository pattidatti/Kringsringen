import sys
from PIL import Image
import base64
import os

try:
    # Ensure we can load the image
    if not os.path.exists('temp_sprite.png'):
        print("Error: temp_sprite.png not found")
        sys.exit(1)

    img = Image.open('temp_sprite.png')
    
    # Crop the Main Panel (0,0 to 80,96)
    # The sprite sheet has 16x16 grid.
    # The panel is 5x6 tiles = 80x96 pixels.
    # Confirming coordinates: 0,0 is top-left.
    crop = img.crop((0, 0, 80, 96))
    
    # Save to buffer
    crop.save('temp_panel.png')
    
    with open('temp_panel.png', 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
        print(b64)

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
