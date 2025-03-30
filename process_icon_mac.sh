#!/bin/bash

# Source image (assuming the PNG is in the current directory)
SOURCE_IMAGE="ai_icon.png"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Source image $SOURCE_IMAGE not found!"
    echo "Please save the icon as ai_icon.png in this directory"
    exit 1
fi

# Output directory
OUTPUT_DIR="AppIcon.appiconset"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Create all needed sizes using sips (built into macOS)
echo "Creating icon sizes..."
sips -z 16 16 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_16x16.png"
sips -z 32 32 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_16x16@2x.png"
sips -z 32 32 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_32x32.png"
sips -z 64 64 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_32x32@2x.png"
sips -z 128 128 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_128x128.png"
sips -z 256 256 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_128x128@2x.png"
sips -z 256 256 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_256x256.png"
sips -z 512 512 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_256x256@2x.png"
sips -z 512 512 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_512x512.png"
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$OUTPUT_DIR/icon_512x512@2x.png"

# Update the Contents.json file with filenames (modifying the existing file)
echo "Updating Contents.json..."
cat > "$OUTPUT_DIR/Contents.json" << EOF
{
  "images" : [
    {
      "filename" : "icon_16x16.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "16x16"
    },
    {
      "filename" : "icon_16x16@2x.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "16x16"
    },
    {
      "filename" : "icon_32x32.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "32x32"
    },
    {
      "filename" : "icon_32x32@2x.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "32x32"
    },
    {
      "filename" : "icon_128x128.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "128x128"
    },
    {
      "filename" : "icon_128x128@2x.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "128x128"
    },
    {
      "filename" : "icon_256x256.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "256x256"
    },
    {
      "filename" : "icon_256x256@2x.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "256x256"
    },
    {
      "filename" : "icon_512x512.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "512x512"
    },
    {
      "filename" : "icon_512x512@2x.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "512x512"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# Create .icns file using iconutil (built into macOS)
echo "Creating .icns file..."
iconutil -c icns "$OUTPUT_DIR"

echo "✅ Icon set created successfully!"
echo "- AppIcon.appiconset: Use this folder in Xcode by dragging it to the Assets catalog"
echo "- AppIcon.icns: This file can be used directly as an icon file for macOS apps" 