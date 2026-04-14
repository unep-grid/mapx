# vim:set ft=dockerfile:

FROM eclipse-temurin:21-jre-jammy

LABEL maintainer="Fred Moser <frederic.moser@unepgrid.ch>"

ARG GEOSERVER_VERSION=2.28.3

# Used in startup script, can be changed
ENV GEOSERVER_ADMIN_PASSWORD=1234

# Build-time only
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
  -Djava.awt.headless=true \
  -Dfile.encoding=UTF-8 \
  -Djavax.servlet.request.encoding=UTF-8 \
  -Djavax.servlet.response.encoding=UTF-8 \
  -XX:SoftRefLRUPolicyMSPerMB=36000 \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  ${GEOSERVER_OPTS}"

WORKDIR ${GEOSERVER_HOME}

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    wget \
    unzip \
    libfreetype6 \
    fontconfig; \
  wget -O geoserver.zip "https://sourceforge.net/projects/geoserver/files/GeoServer/${GEOSERVER_VERSION}/geoserver-${GEOSERVER_VERSION}-bin.zip/download"; \
  unzip -d . geoserver.zip; \
  rm -f geoserver.zip; \
  wget -O mbstyle.zip "https://sourceforge.net/projects/geoserver/files/GeoServer/${GEOSERVER_VERSION}/extensions/geoserver-${GEOSERVER_VERSION}-mbstyle-plugin.zip/download"; \
  unzip -od ./webapps/geoserver/WEB-INF/lib mbstyle.zip; \
  rm -f mbstyle.zip; \
  rm -rf /var/lib/apt/lists/*

#--------------------- Debian / Ubuntu user setting ----------------------------
ENV USER=geoserver
ENV GROUP=geoserver
ENV UID=66712
ENV GID=101
ENV DATADIR=${GEOSERVER_DATA_DIR}

RUN addgroup \
    --system \
    --gid ${GID} \
    ${GROUP} && \
    adduser \
      --system \
      --disabled-password \
      --gecos "" \
      --ingroup ${GROUP} \
      --no-create-home \
      --uid ${UID} \
      ${USER}

RUN chown -R ${USER}:${GROUP} ${GEOSERVER_HOME}

RUN mkdir -p ${DATADIR} && chown -R ${USER}:${GROUP} ${DATADIR}

USER ${USER}
VOLUME ${DATADIR}
#-------------------------------------------------------------------------------

COPY ./start.sh ./start.sh

CMD ["sh", "./start.sh"]

EXPOSE 8080