#!/bin/bash 
#------------------------------------------------------------------------------#
#
#  Build MapX Docker image 
#  (c) unige.ch 
#  
#------------------------------------------------------------------------------#
set -e
source ./../sh/build_docker_multiarch.sh 

MAPX_VERSION=$(cat ./../version.txt)
R_VERSION="4.2.1"
R_DATE="2022-05-01"
NAME="mapx_app"
REPO="fredmoser"
TAG="${REPO}/${NAME}:${MAPX_VERSION}"

build \
  $@ \
  -t $TAG \
  -b R_VERSION=$R_VERSION \
  -b R_DATE=$R_DATE

