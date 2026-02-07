"""
Convert devXflowpro.png to app.ico for Dev-X-Flow-Pro
Run this script to generate the new icon file
"""
from PIL import Image
import os

def convert_png_to_ico():
    # Source PNG file
    source_png = "Dev-X-Flow-Pro/window_icon.png"
    output_ico = "Dev-X-Flow-Pro/app.ico"
    
    # Check if source exists
    if not os.path.exists(source_png):
        print(f"Error: Source file not found: {source_png}")
        return False
    
    try:
        # Open the PNG image
        img = Image.open(source_png)
        
        # Convert to RGBA if necessary
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create icon with multiple sizes
        sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        
        # Resize and save as ICO
        img.save(output_ico, format='ICO', sizes=sizes)
        
        print(f"✅ Successfully created: {output_ico}")
        print(f"   Source: {source_png}")
        print(f"   Sizes: {sizes}")
        return True
        
    except ImportError:
        print("❌ Pillow (PIL) is not installed")
        print("   Install with: pip install Pillow")
        return False
    except Exception as e:
        print(f"❌ Error converting image: {e}")
        return False

if __name__ == "__main__":
    convert_png_to_ico()
