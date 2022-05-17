#
# MapX base image, without code
#
# ⚠️  Versions overwritten by the build script 
#
ARG R_VERSION=4.2.0
ARG R_DATE=2022-05-01

ARG MAPX_HOME=/app
ARG R_LIBS="/usr/local/R/library"

FROM r-base:${R_VERSION} as builder

MAINTAINER Fred Moser "frederic.moser@unepgrid.ch"
ENV DEBIAN_FRONTEND noninteractive

ARG R_VERSION
ARG R_DATE
ARG R_LIBS
ENV R_LIBS=$R_LIBS

WORKDIR $R_LIBS

ENV r_deps_dev="\
    r-base-dev="${R_VERSION}-*" \
    libcurl4-openssl-dev \
    libxml2-dev \
    libssl-dev \
    libcairo2-dev \
    libxt-dev \
    libpq-dev \
    libsodium-dev"
ENV r_deps_sys="\
    libxml2 \
    libpq5 \
    ca-certificates"

RUN apt-get update 
RUN apt install -y $r_deps_sys 
RUN apt install -y $r_deps_dev 

#
# Install wrapper : 
#  - Use date to fix package version  
#  - QUIT if errored
#
RUN echo  "\
rep <- getOption('repos');\
rep['CRAN'] <- 'https://mran.microsoft.com/snapshot/$R_DATE';\
options(Ncpus = $(nproc --all));\
options(repos = rep); \
install = function(pkg){ \
  install.packages(pkg); \
  tryCatch(library(pkg,character.only=T), \
      error = function(e){ \
      print(e);\
      quit('no',status=1);\
      })\
}" > /etc/R/Rprofile.site

#
# Install step by step, easier ro recover.         
#
RUN Rscript -e 'install("shiny")'
RUN Rscript -e 'install("xml2")'
RUN Rscript -e 'install("curl")'
RUN Rscript -e 'install("pool")'
RUN Rscript -e 'install("RPostgreSQL")'
RUN Rscript -e 'install("memoise")'
RUN Rscript -e 'install("magrittr")'
RUN apt-get purge -y --auto-remove $r_deps_dev \
    && apt-get clean \
    && apt-get autoclean \
    && apt-get autoremove \
    && rm -rf /var/lib/apt/lists/*

#
# Import in lightweight image
#
FROM scratch as final

ARG MAPX_HOME
ARG R_LIBS
ENV R_LIBS=$R_LIBS

COPY --from=builder / /

WORKDIR $MAPX_HOME

COPY . .

#--------------------- Debian / alpine user setting ----------------------------
ENV USER=app
ENV GROUP=mapx
ENV GID=12345
ENV DATADIR=/shared

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

RUN mkdir -p $DATADIR && chown -R $USER:$GROUP $DATADIR 

VOLUME $DATADIR
USER $USER 
#-------------------------------------------------------------------------------

EXPOSE 3838
CMD ["sh","./start_mapx.sh"]
