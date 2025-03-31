#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Please install it using 'brew install imagemagick'"
    exit 1
fi

# Source image (assuming the PNG is in the current directory)
SOURCE_IMAGE="ai_icon.png"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Source image $SOURCE_IMAGE not found!"
    exit 1
fi

# Output directory
OUTPUT_DIR="AppIcon.appiconset"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Create all needed sizes
convert "$SOURCE_IMAGE" -resize 16x16 "$OUTPUT_DIR/icon_16x16.png"
convert "$SOURCE_IMAGE" -resize 32x32 "$OUTPUT_DIR/icon_16x16@2x.png"
convert "$SOURCE_IMAGE" -resize 32x32 "$OUTPUT_DIR/icon_32x32.png"
convert "$SOURCE_IMAGE" -resize 64x64 "$OUTPUT_DIR/icon_32x32@2x.png"
convert "$SOURCE_IMAGE" -resize 128x128 "$OUTPUT_DIR/icon_128x128.png"
convert "$SOURCE_IMAGE" -resize 256x256 "$OUTPUT_DIR/icon_128x128@2x.png"
convert "$SOURCE_IMAGE" -resize 256x256 "$OUTPUT_DIR/icon_256x256.png"
convert "$SOURCE_IMAGE" -resize 512x512 "$OUTPUT_DIR/icon_256x256@2x.png"
convert "$SOURCE_IMAGE" -resize 512x512 "$OUTPUT_DIR/icon_512x512.png"
convert "$SOURCE_IMAGE" -resize 1024x1024 "$OUTPUT_DIR/icon_512x512@2x.png"

# Update the Contents.json file with filenames
sed -i '' 's/"idiom" : "mac",\n      "scale" : "1x",\n      "size" : "16x16"/"idiom" : "mac",\n      "filename" : "icon_16x16.png",\n      "scale" : "1x",\n      "size" : "16x16"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "2x",\n      "size" : "16x16"/"idiom" : "mac",\n      "filename" : "icon_16x16@2x.png",\n      "scale" : "2x",\n      "size" : "16x16"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "1x",\n      "size" : "32x32"/"idiom" : "mac",\n      "filename" : "icon_32x32.png",\n      "scale" : "1x",\n      "size" : "32x32"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "2x",\n      "size" : "32x32"/"idiom" : "mac",\n      "filename" : "icon_32x32@2x.png",\n      "scale" : "2x",\n      "size" : "32x32"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "1x",\n      "size" : "128x128"/"idiom" : "mac",\n      "filename" : "icon_128x128.png",\n      "scale" : "1x",\n      "size" : "128x128"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "2x",\n      "size" : "128x128"/"idiom" : "mac",\n      "filename" : "icon_128x128@2x.png",\n      "scale" : "2x",\n      "size" : "128x128"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "1x",\n      "size" : "256x256"/"idiom" : "mac",\n      "filename" : "icon_256x256.png",\n      "scale" : "1x",\n      "size" : "256x256"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "2x",\n      "size" : "256x256"/"idiom" : "mac",\n      "filename" : "icon_256x256@2x.png",\n      "scale" : "2x",\n      "size" : "256x256"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "1x",\n      "size" : "512x512"/"idiom" : "mac",\n      "filename" : "icon_512x512.png",\n      "scale" : "1x",\n      "size" : "512x512"/g' "$OUTPUT_DIR/Contents.json"
sed -i '' 's/"idiom" : "mac",\n      "scale" : "2x",\n      "size" : "512x512"/"idiom" : "mac",\n      "filename" : "icon_512x512@2x.png",\n      "scale" : "2x",\n      "size" : "512x512"/g' "$OUTPUT_DIR/Contents.json"

# Also create .icns file (optional)
if command -v iconutil &> /dev/null; then
    echo "Creating .icns file..."
    iconutil -c icns "$OUTPUT_DIR"
    echo "Created AppIcon.icns"
else
    echo "iconutil not found, skipping .icns creation"
fi

echo "Icon set created successfully in $OUTPUT_DIR"
echo "You can now drag this folder into Xcode's asset catalog" 