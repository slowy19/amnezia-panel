FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --ignore-scripts; \
    yarn next telemetry disable;

COPY . .
RUN yarn build

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/public /app/public
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/prisma /app/prisma
RUN chmod +x /app/start.sh

EXPOSE 8443

CMD ["/app/start.sh"]