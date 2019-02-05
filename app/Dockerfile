FROM r-base:3.5.1

MAINTAINER Fred Moser "frederic.moser@unepgrid.ch"

#
# Settings 
#
ENV DEBIAN_FRONTEND noninteractive
VOLUME /shared
WORKDIR /build

ARG r_base_version=3.5.1
ARG r_deps_dev="r-base-dev="${r_base_version}-*" libcurl4-gnutls-dev libxml2-dev libssl-dev/unstable libcairo2-dev/unstable libxt-dev"
ARG r_deps_sys="gdal-bin libpq-dev ca-certificates"
ARG r_deps_shiny_server="sudo gdebi-core pandoc pandoc-citeproc"
ARG r_packages_date="2018-12-04"
ARG r_packages="c('RPostgreSQL','shiny','rmarkdown','memoise','jsonlite','magrittr','curl','later','pool','xml2','geosapi','devtools')"
ARG r_app_path="/srv/shiny-server/mapx"

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
      && apt-get clean \
      && apt-get autoclean \
      && apt-get autoremove \
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
    install.packages("$r_packages"); \n \
    library(devtools) ; \n \
    install_github('eblondel/geosapi',ref='c5fd951');" > install.R \
    && Rscript install.R \ 
    && apt-get purge -y --auto-remove $r_deps_dev \
    && apt-get clean \
    && apt-get autoclean \
    && apt-get autoremove \
    && rm -rf /var/lib/apt/lists/* 

COPY . /srv/shiny-server/mapx
COPY ./start_mapx.sh /usr/bin/start_mapx.sh

CMD ["sh","/usr/bin/start_mapx.sh"]

