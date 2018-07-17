FROM r-base:latest

MAINTAINER Fred Moser "frederic.moser@unepgrid.ch"

#
# R shiny launcher
#
ENV R_BASE_VERSION 3.5.0
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV SHINY_PORT=3838
ENV SHINY_PORT_DEV=3434
ENV MAPX_PATH_SHARED="/shared"
ENV MAPX_PATH_USERDATA="/shared/userdata"
ENV MAPX_PATH_DOWNLOAD="/shared/download"
ENV MAPX_PATH_LOG="/shared/logs"
ENV MAPX_PATH_APP="/srv/shiny-server/mapx"
ENV DEBIAN_FRONTEND noninteractive

ARG r_deps_dev="r-base-dev="${R_BASE_VERSION}-*
ARG r_deps_sys="gdal-bin libpq-dev libcurl4-gnutls-dev libxml2-dev ca-certificates"
ARG r_deps_shiny_server="sudo gdebi-core pandoc pandoc-citeproc libcairo2-dev/unstable libxt-dev"
ARG r_packages_date="2018-06-02"
ARG r_packages="c('RPostgreSQL','shiny','rmarkdown','memoise','jsonlite','magrittr','curl','later','pool','xml2')"

VOLUME /shared
WORKDIR /build
#
# SHINY SERVER
#

RUN apt-get update \
      && apt install -y -t unstable $r_deps_shiny_server \
      && wget --no-verbose https://s3.amazonaws.com/rstudio-shiny-server-os-build/ubuntu-12.04/x86_64/VERSION -O "version.txt" \
      && VERSION=$(cat version.txt)  \
      && wget --no-verbose "https://s3.amazonaws.com/rstudio-shiny-server-os-build/ubuntu-12.04/x86_64/shiny-server-$VERSION-amd64.deb" -O ss-latest.deb \
      && gdebi -n ss-latest.deb \
      && rm -f version.txt ss-latest.deb \
      && rm -rf /srv/shiny-server \
      && mkdir -p /srv/shiny-server \
      && rm -rf /var/lib/apt/lists/* 

#
# MAPX
#
RUN apt-get update \
    && apt install -y -t unstable $r_deps_sys \
    && apt install -y -t unstable $r_deps_dev \
    && echo "\
    rep <- getOption('repos'); \
    rep['CRAN'] <- 'https://mran.microsoft.com/snapshot/"$r_packages_date"'; \
    options(repos = rep); \
    install.packages("$r_packages")" > install.R \
    && Rscript install.R \ 
    && apt-get purge -y --auto-remove $r_deps_dev \
    && apt-get clean \
    && apt-get autoclean \
    && apt-get autoremove 

#
# Config server
#
RUN dest=${MAPX_PATH_APP}/settings/settings-local.R\
    && echo "\
    #!/bin/sh \n
    echo 'config\$api\$port <- '\\\"\$API_PORT\\\" >  $dest \n\
    echo 'config\$api\$host <- '\\\"\$API_HOST\\\" >>  $dest \n\
    echo 'config\$resources\$userdata <- '\\\"\$MAPX_PATH_USERDATA\\\" >>  $dest \n\
    echo 'config\$resources\$download <- '\\\"\$MAPX_PATH_DOWNLOAD\\\" >>  $dest \n\
    echo 'config\$pg\$encryptKey <- '\\\"\$POSTGRES_KEY_ENCRYPT\\\" >>  $dest \n\
    echo 'config\$pg\$user <- '\\\"\$POSTGRES_USER_WRITE\\\" >>  $dest \n\
    echo 'config\$pg\$password <- '\\\"\$POSTGRES_USER_WRITE_PASSWORD\\\" >>  $dest \n\
    echo 'config\$pg\$host <- '\\\"\$POSTGRES_HOST\\\" >>  $dest \n\
    echo 'config\$project\$default <- '\\\"\$MAPX_PROJECT_DEFAULT\\\" >>  $dest \n\
    mkdir -p "${MAPX_PATH_LOG}" \n\
    chown shiny:shiny "${MAPX_PATH_LOG}" \n\
    exec shiny-server 2>&1 " > /usr/bin/shiny-server.sh \
    && cat /usr/bin/shiny-server.sh \
    && chmod +x /usr/bin/shiny-server.sh \
    && echo "\
    run_as shiny; \
    server { \
    listen "${SHINY_PORT}";\
    location / { \
      app_dir "${MAPX_PATH_APP}"; \
      log_dir "${MAPX_PATH_LOG}"; \
    }}" > /etc/shiny-server/shiny-server.conf

COPY . ${MAPX_PATH_APP}/

CMD ["sh","/usr/bin/shiny-server.sh"]

