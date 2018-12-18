#!/bin/bash

#
# Script to build and push new image in remote docker repository
#
NEW_VERSION=$1
OLD_VERSION=`cat version.txt`
echo $NEW_VERSION
FG_GREEN="\033[32m"
FG_NORMAL="\033[0m"

if [ -z "$NEW_VERSION" ]
then
  echo "NOT updated ! Old version version =  $OLD_VERSION new version = $NEW_VERSION"
  exit 1
fi

echo -e "Updating from version $FG_GREEN$OLD_VERSION$FG_NORMAL to $FG_GREEN$NEW_VERSION$FG_NORMAL. This script will:"
echo "- Blindly replace those values in app and api package.json, docker-compose.yml and version.txt;"
echo "- Build the prod version of the app"
echo "- Build new images and push them to remote repository set in the docker file."

echo "enter YES to confirm"
read continue


if [ "$continue" != "YES"  ]
then 
  echo "Stop here"
  exit 1
fi


echo "Update package.json"
REP_PACKAGE_VERSION='s/"version": "'"$OLD_VERSION"'"/"version": "'"$NEW_VERSION"'"/g'
perl -pi -e "$REP_PACKAGE_VERSION" ./app/package.json
perl -pi -e "$REP_PACKAGE_VERSION" ./api/package.json
echo "Update version.txt"
REP_VERSION='s/'"$OLD_VERSION"'/'"$NEW_VERSION"'/g'
perl -pi -e "$REP_VERSION"  version.txt
echo "Update docker-compose.yml"
REP_API_TAG='s/mx-api-node:'"$OLD_VERSION"'-alpine/mx-api-node:'"$NEW_VERSION"'-alpine/g'
REP_APP_TAG='s/mx-app-shiny:'"$OLD_VERSION"'-debian/mx-app-shiny:'"$NEW_VERSION"'-debian/g'
perl -pi -e $REP_API_TAG ./docker-compose.yml
perl -pi -e $REP_APP_TAG ./docker-compose.yml


git --no-pager diff --minimal docker-compose.yml app/package.json api/package.json version.txt

echo "Verify git diff and enter YES to build and push"
read continue


if [ "$continue" != "YES"  ]
then 
  echo "Stop here"
  exit 1
fi


echo "Build webpack prod"
cd ./app
npm run prod
cd ../

echo "Build app"
docker-compose build app && docker-compose push app

echo "Build api"
docker-compose build api && docker-compose push api

echo "Done"

