FROM r-base:4.0.3 as builder

MAINTAINER Fred Moser "frederic.moser@unepgrid.ch"

ARG R_VERSION="4.0.3"
ARG R_DATE="2020-12-10"

#
# Settings 
#
ENV DEBIAN_FRONTEND noninteractive

VOLUME /shared

ARG r_deps_dev="\
    r-base-dev="${R_VERSION}-*" \
    libcurl4-openssl-dev \
    libxml2-dev \
    libssl-dev \
    libcairo2-dev \
    libxt-dev \
    libsodium-dev"
ARG r_deps_sys="\
    libxml2 \
    libpq-dev \
    ca-certificates"

RUN apt-get update 
RUN apt install -y $r_deps_sys 
RUN apt install -y $r_deps_dev 
RUN echo "local({\
           rep <- getOption('repos');\
           rep['CRAN'] <- 'https://mran.microsoft.com/snapshot/"$R_DATE"'; \
           options(repos = rep)\
          })" > /etc/R/Rprofile.site
#
# Install from 
#
RUN Rscript -e 'install.packages("geosapi")'
RUN Rscript -e 'install.packages("shiny")'
RUN Rscript -e 'install.packages("xml2")'
RUN Rscript -e 'install.packages("curl")'
RUN Rscript -e 'install.packages("pool")'
RUN Rscript -e 'install.packages("RPostgreSQL")'
RUN Rscript -e 'install.packages("memoise")'
RUN Rscript -e 'install.packages("magrittr")'
RUN apt-get purge -y --auto-remove $r_deps_dev \
    && apt-get clean \
    && apt-get autoclean \
    && apt-get autoremove \
    && rm -rf /var/lib/apt/lists/*

FROM debian:testing as final

WORKDIR /app

COPY --from=builder / /

EXPOSE 3838

CMD ["R"]

