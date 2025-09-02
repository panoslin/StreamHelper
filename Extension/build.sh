zip -r ../StreamHelper-Extension-v1.0.0.zip . -x "*.DS_Store" "*/.*" "*/node_modules/*"
cd .. && mv StreamHelper-Extension-v1.0.0.zip Client/dist-packages/
