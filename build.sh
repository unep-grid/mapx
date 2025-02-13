#!/bin/bash
set -e

#
# Script to build docker images locally for testing
#

DRY="true" 
DOCKER_REPO_APP="fredmoser/mapx_app"
DOCKER_REPO_API="fredmoser/mapx_api"

VERSION=$(cat version.txt)

FG_GREEN="\033[32m"
FG_RED="\033[31m"
FG_NORMAL="\033[0m"
FG_CYAN="\033[36m"

DIR_CUR="$(pwd)"
DIR_APP="$DIR_CUR/app"
DIR_SDK="$DIR_CUR/app/src/js/sdk"
DIR_API="$DIR_CUR/api"

#
# log/re log in docker 
#
docker login

#
# Helpers 
#
usage() {
  echo -e "Usage: $0 [-a actually do it]" 1>&2; 
  if [[ -z $DRY ]]
  then
    exit 1
  fi
}

# generic error
error()
{
  echo -e "${FG_RED}ERROR${FG_NORMAL}: $1"
  if [[ $2 -eq 1 ]]
  then
    usage
  fi
  if [[ -z $DRY ]]
  then
    exit 1
  fi
}

# Check tooling 
check_command()
{
  if [[ -z `command -v $1` ]]; 
  then 
    error "Missing command $1, please install it"
  fi
}

#--------------------------------------------------------------------------------
# Check installed tools  
#--------------------------------------------------------------------------------

check_command 'docker'
check_command 'npm'

#--------------------------------------------------------------------------------
# Parse options 
#--------------------------------------------------------------------------------

while getopts "ha" opt; do
  case "$opt" in
    h|\?)
      usage
      ;;
    a)
      DRY=""
      ;;
  esac
done

DOCKER_TAG_API="$DOCKER_REPO_API:$VERSION"
DOCKER_TAG_APP="$DOCKER_REPO_APP:$VERSION"

#--------------------------------------------------------------------------------
# Confirm
#--------------------------------------------------------------------------------

MSG_CONFIRM="Build docker images with version $FG_GREEN$VERSION$FG_NORMAL [YES/NO]"

if [[ -z $DRY ]]
then
  MSG_CONFIRM="Dry mode ${FG_GREEN}DISABLED${FG_NORMAL}: $MSG_CONFIRM"
else
  MSG_CONFIRM="Dry mode ${FG_CYAN}ENABLED${FG_NORMAL}: $MSG_CONFIRM"
fi

echo -e "$MSG_CONFIRM "

if [[ -z $DRY ]]
then
  read confirm_diff
  if [[ "$confirm_diff" != "YES"  ]]
  then
    error "User cancelled"
    exit 1
  fi
fi 

#--------------------------------------------------------------------------------
# Build prod 
#--------------------------------------------------------------------------------

echo "Build sdk, app, api prod + build docker images"

if [[ -z $DRY ]]
then 
  echo "Build sdk prod"
  cd $DIR_SDK
  npm run prod

  echo "Build app prod"
  cd $DIR_APP
  npm run prod_docker 

  echo "Build api prod"
  cd $DIR_API
  npm run prod_docker 
fi

cd $DIR_CUR

echo "Done"
