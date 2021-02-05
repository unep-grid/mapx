FROM fredmoser/mapx_alpine_node_gdal:node15.8.0gdal3.1.3

#
# Install node packages, copy files
#
ENV NODE_OPTIONS="--max-old-space-size=4096"
WORKDIR /build
COPY package.json package-lock.json ./

RUN npm install --production \
    && mv node_modules /node_modules

WORKDIR /api
COPY . .

VOLUME /shared
EXPOSE 3030

CMD ["node", "index.js"]

