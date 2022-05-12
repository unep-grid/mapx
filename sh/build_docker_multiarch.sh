#!/bin/bash 

#------------------------------------------------------------------------------#
#
#  Build MapX multi arch images
#  (c) unige.ch 
#  
#------------------------------------------------------------------------------#
set -e

TAG=""
PROD=""
LOCAL=""
DRY="true"
BUILDERNAME=mx_builder

if [[ ! -s "Dockerfile" ]]
then
  echo "Requires location with valid DockerFile"
  exit 1 
fi

usage() {
  echo "Usage: $0 [-p push, else local ] [-a actually do it] [-b build args] [-t tag]" 1>&2; exit 1; 
}

build(){

  while getopts "apb:t:" opt; do
    case "$opt" in
      h|\?)
        usage
        ;;
      p)
        PROD="true"
        ;;
      a)
        DRY=""
        ;;
      b) 
        BUILD_ARGS+=" --build-arg $OPTARG "
        ;;
      t) 
        TAG=" --tag $OPTARG "
        ;;
    esac
  done

#------------------------------------------------------------------------------#
#  Build 
#------------------------------------------------------------------------------#

if [[ -n "$PROD" ]]
  # 
  #  Build prod 
  #  - multi arch 
  #  - push (require login) 
  #
then 
  echo "Build multiarch $TAG and push"

  if [[ -n "$DRY" ]]
  then
    echo "[dry]"
  else
    NBUILDER=$(docker buildx ls | grep $BUILDERNAME | wc -l)

    if [[ $NBUILDER -eq 0 ]]
    then 
      docker buildx create --name $BUILDERNAME
    else
      echo "Builder $BUILDERNAME already exists"
    fi

    docker buildx use $BUILDERNAME 
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      --push \
      $BUILD_ARGS $TAG .
  fi

else 
  #
  #  Build locally
  #  - test
  #  - debug 
  # 
  echo "Build $TAG locally"

  if [[ -n "$DRY" ]]
  then
    echo "[dry]"
  else
    docker buildx use default
    docker buildx build \
      --progress plain \
      $BUILD_ARGS $TAG .
  fi
  exit 0
fi
}



