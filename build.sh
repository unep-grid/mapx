#!/bin/bash

#
# Script to build and push new image in remote docker repository
#
BRANCH=master
REMOTE=github
NEW_VERSION=$1
OLD_VERSION=`cat version.txt`
echo $NEW_VERSION
FG_GREEN="\033[32m"
FG_NORMAL="\033[0m"
CHANGES_CHECK=$(git status --porcelain | wc -l)
DIR_APP=app
DIR_SDK=app/src/js/sdk
DIR_CUR=$(pwd)
CUR_HASH=$(git rev-parse HEAD)
CHANGELOG_TMP=/tmp/tmp_mgl_changes.md
CHANGELOG=CHANGELOG.md

REPO="https://github.com/unep-grid/map-x-mgl"

USAGE="Usage : bash build.sh $OLD_VERSION"

if [ $CHANGES_CHECK -gt 0 ]
then 
  echo "This project as uncommited changes, stop here"
  exit 1
fi

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" == "$OLD_VERSION" ]
then
  echo "Wrong or missing version. Old version version =  $OLD_VERSION new version = $NEW_VERSION"
  echo "$USAGE"
  exit 1
fi

#
# Should pass js linting
#
cd $DIR_APP
npm run lint

if [ $? -eq 0 ]; then
  echo Linting passed
else
  echo Liniting failed
  exit 1
fi

cd $DIR_CUR


#
# Update version + verification
#

echo "Update package.json"
REP_PACKAGE_VERSION='s/"version": "'"$OLD_VERSION"'"/"version": "'"$NEW_VERSION"'"/g'
perl -pi -e "$REP_PACKAGE_VERSION" ./app/package.json
perl -pi -e "$REP_PACKAGE_VERSION" ./api/package.json
perl -pi -e "$REP_PACKAGE_VERSION" ./app/src/js/sdk/package.json
echo "Update version.txt"
REP_VERSION='s/'"$OLD_VERSION"'/'"$NEW_VERSION"'/g'
perl -pi -e "$REP_VERSION" version.txt
echo "Update docker-compose.yml"
REP_API_TAG='s/mx-api-node:'"$OLD_VERSION"'-alpine/mx-api-node:'"$NEW_VERSION"'-alpine/g'
REP_APP_TAG='s/mx-app-shiny:'"$OLD_VERSION"'-debian/mx-app-shiny:'"$NEW_VERSION"'-debian/g'
perl -pi -e $REP_API_TAG ./docker-compose.yml
perl -pi -e $REP_APP_TAG ./docker-compose.yml

echo "Write changes"
echo "- <a href='${REPO}/tree/${NEW_VERSION}' target='_blank'>${NEW_VERSION}</a>"\
  > $CHANGELOG_TMP
cat $CHANGELOG >> $CHANGELOG_TMP
cp $CHANGELOG_TMP $CHANGELOG 
vim $CHANGELOG

echo "Get diff"
git --no-pager diff --minimal

echo "Verify git diff of versioning changes. Continue (commit, build, push) ? [YES/NO]"

read confirm_diff

if [ "$confirm_diff" != "YES"  ]
then
  echo "Stop here, stash changes. rollback to $CUR_HASH " 
  git stash
  exit 1
fi

echo "Build sdk prod"
cd $DIR_CUR
cd $DIR_SDK
npm run prod

echo "Build webpack prod"
cd $DIR_CUR
cd $DIR_APP
npm run prod

echo "Build app"
cd $DIR_CUR
docker-compose build app 

echo "Build api"
docker-compose build api

echo "Push images, git stage, commit, tag"
docker-compose push api
docker-compose push app
git add .
git commit -m "auto build version $NEW_VERSION"
git tag $NEW_VERSION
git push $REMOTE $BRANCH --tags

echo "Done"

