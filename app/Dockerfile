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

EXPOSE 3838
VOLUME /shared

COPY --from=builder / /
RUN useradd -ms /bin/bash mapx

WORKDIR $MAPX_HOME
USER mapx
COPY . .

CMD ["sh","./start_mapx.sh"]
