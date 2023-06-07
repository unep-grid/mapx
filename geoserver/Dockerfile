# vim:set ft=dockerfile:

FROM openjdk:11-slim-buster

MAINTAINER Fred Moser <frederic.moser@unepgrid.ch>

ARG GEOSERVER_VERSION=2.22.2
# Used in startup script, can be changed 
ENV GEOSERVER_ADMIN_PASSWORD=1234


# Can't be changed
ARG DEBIAN_FRONTEND=noninteractive

ENV GEOSERVER_DATA_DIR=/geoserver/db
ENV GEOSERVER_HOME=/geoserver

ENV INITIAL_MEMORY="2G"
ENV MAXIMUM_MEMORY="4G"
ENV JAIEXT_ENABLED="true"
ENV GEOSERVER_OPTS=" \
  -Dorg.geotools.coverage.jaiext.enabled=${JAIEXT_ENABLED} \
  -Duser.timezone=UTC \
  -Dorg.geotools.shapefile.datetime=true"


ENV JAVA_OPTS="-Xms${INITIAL_MEMORY} -Xmx${MAXIMUM_MEMORY} \
  -Djava.awt.headless=true -server \
  -Dfile.encoding=UTF8 \
  -Djavax.servlet.request.encoding=UTF-8 \
  -Djavax.servlet.response.encoding=UTF-8 \
  -XX:SoftRefLRUPolicyMSPerMB=36000 -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 -XX:ParallelGCThreads=20 -XX:ConcGCThreads=5 \
  ${GEOSERVER_OPTS}"

# Install directory
WORKDIR $GEOSERVER_HOME

RUN set -x \
  && apt-get update \
  && apt-get -y upgrade \
  && apt-get -y install --no-install-recommends openssl wget unzip libfreetype6 fontconfig \
  && wget -O geoserver.zip https://downloads.sourceforge.net/project/geoserver/GeoServer/$GEOSERVER_VERSION/geoserver-$GEOSERVER_VERSION-bin.zip \
  && unzip -d . geoserver.zip \
  && rm -rf geoserver.zip \
  && wget -O mbstyle.zip https://downloads.sourceforge.net/project/geoserver/GeoServer/$GEOSERVER_VERSION/extensions/geoserver-$GEOSERVER_VERSION-mbstyle-plugin.zip \
  && unzip -od ./webapps/geoserver/WEB-INF/lib mbstyle.zip \
  && rm -rf mbstyle.zip

#--------------------- Debian / alpine user setting ----------------------------
ENV USER=geoserver
ENV GROUP=geoserver
ENV UID=66712
ENV GID=101
ENV DATADIR=$GEOSERVER_DATA_DIR

RUN addgroup \
    --system \
    --gid $GID \
     $GROUP &&\
    adduser \
     --system \
     --disabled-password \
     --gecos ""\
     --ingroup $GROUP \
     --no-create-home \
     --uid $UID $USER 

RUN  chown -R $USER:$GROUP $GEOSERVER_HOME

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR 
USER $USER 
VOLUME $DATADIR
#-------------------------------------------------------------------------------

COPY ./start.sh ./start.sh

CMD ["sh","./start.sh"]

EXPOSE 8080


