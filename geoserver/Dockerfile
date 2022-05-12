# vim:set ft=dockerfile:

FROM openjdk:11-slim-buster

MAINTAINER Fred Moser <frederic.moser@unepgrid.ch>

ARG GEOSERVER_VERSION=2.20

ENV GEOSERVER_HOME=/geoserver
ENV GEOSERVER_DATA_DIR=${GEOSERVER_HOME}/data_dir
ENV GEOSERVER_ADMIN_PASSWORD=1234

WORKDIR $GEOSERVER_HOME

RUN set -x \
  && apt-get update \
  && apt-get -y upgrade \
  && apt-get -y install --no-install-recommends  openssl wget unzip libfreetype6 \
  && wget -O geoserver.zip https://build.geoserver.org/geoserver/${GEOSERVER_VERSION}.x/geoserver-${GEOSERVER_VERSION}.x-latest-bin.zip \
  && unzip -d . geoserver.zip \
  && rm -rf geoserver.zip \
  && wget -O mbstyle.zip https://build.geoserver.org/geoserver/${GEOSERVER_VERSION}.x/ext-latest/geoserver-${GEOSERVER_VERSION}-SNAPSHOT-mbstyle-plugin.zip \
  && unzip -od ./webapps/geoserver/WEB-INF/lib mbstyle.zip \
  && rm -rf mbstyle.zip \
  && useradd -ms /bin/bash geoserver \
  && chown -R geoserver $GEOSERVER_HOME 
 
USER geoserver

VOLUME $GEOSERVER_DATA_DIR

COPY ./start.sh ./start.sh

CMD ["sh","./start.sh"]

EXPOSE 8080


