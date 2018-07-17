# Do the npm install or yarn install in the full image
FROM mhart/alpine-node:8
WORKDIR /build
COPY package.json package-lock.json ./

RUN echo "http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && echo "http://nl.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories \
    && apk add --no-cache libressl2.7-libcrypto gdal geos-dev proj4-dev \
    && npm install --production \
    && mv node_modules /node_modules

WORKDIR /api
COPY . .

VOLUME /shared
EXPOSE 3030

CMD ["node","index.js"]

