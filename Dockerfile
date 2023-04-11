FROM node:16-alpine AS builder

WORKDIR /work

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .
RUN yarn build

FROM node:16-alpine AS runner

WORKDIR /work

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /work/dist .

ENTRYPOINT ["node", "index.js"]
