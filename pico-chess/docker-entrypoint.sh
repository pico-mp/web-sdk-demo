#!/bin/sh
# 컨테이너 시작 시 런타임 환경변수를 브라우저에서 읽을 수 있는 env.js로 생성
cat > /usr/share/nginx/html/env.js << EOF
window.__ENV__ = {
  VITE_PICO_API_KEY: "${VITE_PICO_API_KEY}"
};
EOF

exec "$@"
