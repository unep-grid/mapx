#!/bin/bash

R_VERSION="4.0.3"
R_DATE="2020-12-10"

docker build -t fredmoser/mapx_debian:r_${R_VERSION}_${R_DATE} .
