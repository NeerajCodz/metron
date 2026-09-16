FROM node:22-bookworm-slim

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web3/package.json apps/web3/tsconfig.json ./apps/web3/
COPY apps/web3/runtime ./apps/web3/runtime
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @metron/web3 typecheck
RUN pnpm exec tsc -p apps/web3/tsconfig.json
RUN useradd --create-home --uid 10001 metron
USER metron
ENV PORT=8787
EXPOSE 8787
CMD ["node", "apps/web3/dist/runtime/server.js"]
