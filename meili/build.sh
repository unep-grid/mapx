#!/bin/bash 
#------------------------------------------------------------------------------#
#
#  Build Meili image 
#  (c) unige.ch 
#  
#------------------------------------------------------------------------------#
set -e
source ./../sh/build_docker_multiarch.sh 

MEILI_VERSION=0.20.0

NAME="meili"
REPO="fredmoser"
TAG="${REPO}/${NAME}:${MEILI_VERSION}-alpine"

build \
  $@ \
  -t $TAG \
  -b MEILI_VERSION=$MEILI_VERSION 
