FROM fredmoser/alpine_node8.15.1_gdal2.4.0
#
# Install node packages, copy files
#
WORKDIR /build
COPY package.json package-lock.json ./

RUN npm install --production \
    && mv node_modules /node_modules

WORKDIR /api
COPY . .

VOLUME /shared
EXPOSE 3030

CMD ["node","index.js"]

