# vim:set ft=dockerfile:

FROM openjdk:11-slim-buster

MAINTAINER Fred Moser <frederic.moser@unepgrid.ch>

ARG GEOSERVER_VERSION=2.20

# Can't be changed
ENV GEOSERVER_DATA_DIR=/geoserver/db
ENV GEOSERVER_HOME=/geoserver
WORKDIR $GEOSERVER_HOME

# Used in startup script, can be changed 
ENV GEOSERVER_ADMIN_PASSWORD=1234

RUN set -x \
  && apt-get update \
  && apt-get -y upgrade \
  && apt-get -y install --no-install-recommends  openssl wget unzip libfreetype6 \
  && wget -O geoserver.zip https://build.geoserver.org/geoserver/${GEOSERVER_VERSION}.x/geoserver-${GEOSERVER_VERSION}.x-latest-bin.zip \
  && unzip -d . geoserver.zip \
  && rm -rf geoserver.zip \
  && wget -O mbstyle.zip https://build.geoserver.org/geoserver/${GEOSERVER_VERSION}.x/ext-latest/geoserver-${GEOSERVER_VERSION}-SNAPSHOT-mbstyle-plugin.zip \
  && unzip -od ./webapps/geoserver/WEB-INF/lib mbstyle.zip \
  && rm -rf mbstyle.zip


#--------------------- Debian / alpine user setting ----------------------------
ENV USER=geoserver
ENV GROUP=geoserver
ENV GID=66712
ENV DATADIR=$GEOSERVER_DATA_DIR

RUN addgroup \
    --system \
     $GROUP &&\
    adduser \
     --system \
     --disabled-password \
     --gecos ""\
     --ingroup $GROUP \
     --no-create-home \
     --uid $GID $USER 

RUN  chown -R $USER:$GROUP $GEOSERVER_HOME

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR 
USER $USER 
#-------------------------------------------------------------------------------

COPY ./start.sh ./start.sh

CMD ["sh","./start.sh"]

EXPOSE 8080


