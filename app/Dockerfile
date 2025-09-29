#
# MapX base image - Multi-stage approach
#
ARG R_VERSION=4.5.1
ARG R_DATE=2025-09-01
ARG MAPX_HOME=/app
ARG R_LIBS="/usr/local/R/library"

#
# Build stage: Compile R packages
#
FROM rocker/r-ver:$R_VERSION AS r-builder

LABEL maintainer="Fred Moser <frederic.moser@unepgrid.ch>"
ENV DEBIAN_FRONTEND=noninteractive

ARG R_VERSION
ARG R_DATE
ARG R_LIBS
ENV R_LIBS=$R_LIBS

# Install R and ALL dependencies (runtime + build-time)
ENV r_deps_all="\
    build-essential \
    gfortran \
    zlib1g-dev \
    make \
    libcurl4-openssl-dev \
    libxml2-dev \
    libxml2 \
    libssl-dev \
    libcairo2-dev \
    libxt-dev \
    libpq-dev \
    libpq5 \
    libsodium-dev \
    ca-certificates"

RUN apt-get update && \
    apt-get install -y --no-install-recommends $r_deps_all && \
    rm -rf /var/lib/apt/lists/*

WORKDIR $R_LIBS

# Configure R repository
RUN echo 'rep <- getOption("repos"); \
    rep["CRAN"] <- "https://packagemanager.posit.co/cran/'$R_DATE'"; \
    options(Ncpus = 4);\
    '>>"${R_HOME}/etc/Rprofile.site"

# Install R packages
RUN Rscript -e 'install.packages(c("xml2", "curl", "pool", "RPostgreSQL", "memoise", "magrittr", "shiny"))'

# Smoke test
RUN Rscript --vanilla -e '\
   library(xml2); \
   library(curl); \
   library(pool); \
   library(RPostgreSQL); \
   library(memoise); \
   library(magrittr); \
   library(shiny)'

#
# Runtime stage: Clean Debian + R + compiled packages
#
FROM rocker/r-ver:$R_VERSION AS final

ARG MAPX_HOME
ARG R_LIBS
ENV R_LIBS=$R_LIBS

# Install ONLY runtime dependencies
ENV r_deps_runtime="\
    wget \
    libxml2 \
    libpq5 \
    libcurl4 \
    libssl3 \
    libcairo2 \
    libsodium23 \
    ca-certificates"

RUN apt-get update && \
    apt-get install -y --no-install-recommends $r_deps_runtime && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled R packages from builder
COPY --from=r-builder $R_LIBS $R_LIBS

WORKDIR $MAPX_HOME
COPY . .

# System user configuration
ENV USER=app \
    GROUP=mapx \
    UID=12345 \
    GID=101 \
    DATADIR=/shared

# NOTE: messagebus GID conflicts with USER GID.
# -> userdel is a hack. Better ways 
#    a) set a USER GID > 1000 to prevent conflict. Impacts Kubernetes config.
#    b) remove dbus* package + deamon. Non working dpkg/apt.. 
RUN userdel messagebus  &&\
    groupadd \
    --system \
    --gid $GID \
    $GROUP && \
    useradd \
    --system \
    --gid $GID \
    --no-create-home \
    --uid $UID \
    $USER

RUN mkdir -p $DATADIR && \
    chown -R $USER:$GROUP $DATADIR 

VOLUME $DATADIR
USER $USER

EXPOSE 3838
CMD ["sh","./start_mapx.sh"]
