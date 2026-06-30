FROM node:20-alpine

LABEL maintainer="Taftek"
LABEL description="Loxone Miniserver Swagger UI + CORS-free proxy"

WORKDIR /app

COPY server.js index.html loxone-miniserver-api.yaml ./

EXPOSE 8077

ENV PORT=8077 \
    LOX_HOST=192.168.1.77 \
    LOX_PORT=80 \
    LOX_TLS=0 \
    LOX_TLS_INSECURE=0 \
    LOX_USER= \
    LOX_PASS=

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8077/health || exit 1

USER node

CMD ["node", "server.js"]
