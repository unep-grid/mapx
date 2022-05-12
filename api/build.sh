#!/bin/bash 
#------------------------------------------------------------------------------#
#
#  Build MapX API Docker image 
#  (c) unige.ch 
#  
#------------------------------------------------------------------------------#
set -e
source ./../sh/build_docker_multiarch.sh 

MAPX_VERSION=$(cat ./../version.txt)
NAME="mapx_api"
REPO="fredmoser"
TAG="${REPO}/${NAME}:${MAPX_VERSION}"

build \
  $@ \
  -t $TAG \
  -b GDAL_VERSION=3.1.4 \
  -b LIBKML_VERSION=1.3.0 \
  -b NODE_VERSION=16.15.0 \
  -b ALPINE_VERSION=3.15
