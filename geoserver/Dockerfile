# vim:set ft=dockerfile:

FROM openjdk:8-alpine

MAINTAINER Fred Moser <moser.frederic@gmail.com>

ENV GEOSERVER_VERSION=2.14.1
ENV GEOSERVER_HOME=/geoserver
ENV GEOSERVER_DATA_DIR=${GEOSERVER_HOME}/data_dir
ENV GEOSERVER_ADMIN_PASSWORD=1234
ENV JAVA_OPTS -Xms128m -Xmx512m -XX:MaxPermSize=512m

RUN set -x \
  && apk add --no-cache openssl \
  && wget -O /tmp/geoserver.zip https://downloads.sourceforge.net/project/geoserver/GeoServer/$GEOSERVER_VERSION/geoserver-$GEOSERVER_VERSION-bin.zip \
  && unzip -d /tmp/ /tmp/geoserver.zip \
  && mv /tmp/geoserver-$GEOSERVER_VERSION $GEOSERVER_HOME \
  && rm -rf /tmp/geoserver.zip \
  && adduser -S geoserver \
  && chown -R geoserver $GEOSERVER_HOME 
  
WORKDIR $GEOSERVER_HOME
VOLUME $GEOSERVER_DATA_DIR

COPY ./start.sh ./start.sh

CMD ["sh","./start.sh"]

EXPOSE 8080


