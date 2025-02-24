#
# MapX base image, without code
#
# ⚠️  Versions overwritten by the build script 
#
ARG R_VERSION=4.4.2
ARG R_DATE=2025-02-10

ARG MAPX_HOME=/app
ARG R_LIBS="/usr/local/R/library"

FROM r-base:${R_VERSION} AS builder

LABEL maintainer="Fred Moser <frederic.moser@unepgrid.ch>"
ENV DEBIAN_FRONTEND=noninteractive

ARG R_VERSION
ARG R_DATE
ARG R_LIBS
ENV R_LIBS=$R_LIBS

WORKDIR $R_LIBS

# System dependencies
ENV r_deps_dev="\
    r-base-dev \
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

# Install system dependencies and clean up in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends usrmerge && \
    apt-get install -y --no-install-recommends $r_deps_sys && \
    apt-get install -y --no-install-recommends $r_deps_dev && \
    rm -rf /var/lib/apt/lists/*


# Configure R repository
RUN echo 'rep <- getOption("repos"); \
    rep["CRAN"] <- "https://packagemanager.posit.co/cran/'$R_DATE'"; \
    options(Ncpus = 4);\
    options(repos = rep)' > .Rprofile

# install pak
RUN Rscript -e 'install.packages("pak")';

# Install R packages individually for better error handling and caching
RUN Rscript -e 'pak::pkg_install("xml2")'
RUN Rscript -e 'pak::pkg_install("curl")'
RUN Rscript -e 'pak::pkg_install("pool")'
RUN Rscript -e 'pak::pkg_install("RPostgreSQL")'
RUN Rscript -e 'pak::pkg_install("memoise")'
RUN Rscript -e 'pak::pkg_install("magrittr")'
RUN Rscript -e 'pak::pkg_install("shiny")'

# Cleanup development dependencies
RUN apt-get update && \
    apt-get remove -y $r_deps_dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

#
# Final stage
#
FROM scratch AS final

ARG MAPX_HOME
ARG R_LIBS
ENV R_LIBS=$R_LIBS

COPY --from=builder / /

WORKDIR $MAPX_HOME

COPY . .

# System user configuration
ENV USER=app \
    GROUP=mapx \
    UID=12345 \
    GID=101 \
    DATADIR=/shared

RUN groupadd \
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
