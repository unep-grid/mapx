#!/bin/bash 
#------------------------------------------------------------------------------#
#
#  Build MapX geoserver image 
#  (c) unige.ch 
#  
#------------------------------------------------------------------------------#
set -e
source ./../sh/build_docker_multiarch.sh 

GEOSERVER_VERSION=2.20
NAME="geoserver"
REPO="fredmoser"
TAG="${REPO}/${NAME}:${GEOSERVER_VERSION}"

build \
  $@ \
  -t $TAG \
  -b GEOSERVER_VERSION=$GEOSERVER_VERSION 
