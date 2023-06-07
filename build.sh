#!/bin/bash
set -e

#
# Script to build and push new image in remote docker repository
#

DRY="true" 
REPO="https://github.com/unep-grid/mapx"
BRANCH=$(git branch --show-current)
REMOTE="github"
DOCKER_REPO_APP="fredmoser/mapx_app"
DOCKER_REPO_API="fredmoser/mapx_api"

NEW_VERSION=""
OLD_VERSION=$(cat version.txt)

FG_GREEN="\033[32m"
FG_RED="\033[31m"
FG_NORMAL="\033[0m"
FG_CYAN="\033[36m"

DIR_CUR="$(pwd)"
DIR_APP="$DIR_CUR/app"
DIR_SDK="$DIR_CUR/app/src/js/sdk"
DIR_API="$DIR_CUR/api"

CHANGES_CHECK="$(git status --porcelain | wc -l)"
CUR_HASH="$(git rev-parse HEAD)"
CHANGELOG="changelog.md"
CHANGELOG_TMP="/tmp/changelog.md"

#
# Helpers 
#
usage() {
  echo -e "Usage: $0 [-v version <version>. E.g. \"-v $FG_CYAN$OLD_VERSION$FG_NORMAL\" ] [-a actually do it]" 1>&2; 

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

# Update version in package.json
update_json()
{
  yq -o=json -P -i '.version = "'$NEW_VERSION'"' $1
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

check_command 'yq'
check_command 'git'
check_command 'docker'
check_command 'npm'
check_command 'vim'

#--------------------------------------------------------------------------------
# Parse options 
#--------------------------------------------------------------------------------

while getopts "hav:" opt; do
  case "$opt" in
    h|\?)
      usage
      ;;
    v)
      NEW_VERSION=$OPTARG
      ;;
    a)
      DRY=""
      ;;
  esac
done

if [[ $CHANGES_CHECK -gt 0 ]]
then 
  error "This project has uncommited changes"
fi

if [[ -z "$NEW_VERSION" ]]
then 
  error "Missing version" 1
fi

if [[ "$NEW_VERSION" == "$OLD_VERSION" ]]
then
  error "Same old/new version" 1
fi

DOCKER_TAG_API="$DOCKER_REPO_API:$NEW_VERSION"
DOCKER_TAG_APP="$DOCKER_REPO_APP:$NEW_VERSION"


#--------------------------------------------------------------------------------
# Confirm
#--------------------------------------------------------------------------------

MSG_CONFIRM="Build, commit and push $FG_GREEN$NEW_VERSION$FG_NORMAL on branch $FG_GREEN$BRANCH$FG_NORMAL in remote $FG_GREEN$REMOTE$FG_NORMAL [YES/NO]"

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
# Update versions in files 
#--------------------------------------------------------------------------------


echo -e "Update versions in version.txt, package.json to $FG_GREEN$NEW_VERSION$FG_NORMAL "
echo -e "Update api/api_dev image in docker-compose.yml to $FG_GREEN$DOCKER_TAG_API$FG_NORMAL "
echo -e "Update app/app_dev image in docker-compose.yml to $FG_GREEN$DOCKER_TAG_APP$FG_NORMAL "

if [[ -z $DRY ]]
then
  # Package, versions.txt
  echo $NEW_VERSION > version.txt 
  update_json ./app/package.json 
  update_json ./app/src/js/sdk/package.json 
  update_json ./api/package.json 

  # Compose file
  yq -o='yaml' -i '.services.app.image ="'$DOCKER_TAG_APP'"' docker-compose.yml
  yq -o='yaml' -i '.services.app_dev.image ="'$DOCKER_TAG_APP'"' docker-compose.yml
  yq -o='yaml' -i '.services.api.image ="'$DOCKER_TAG_API'"' docker-compose.yml
  yq -o='yaml' -i '.services.api_dev.image ="'$DOCKER_TAG_API'"' docker-compose.yml
fi


#--------------------------------------------------------------------------------
# Linting 
#--------------------------------------------------------------------------------

cd $DIR_APP
echo "Lint app"
if [[ -z $DRY ]]
then
  npm run lint
fi 

if [[ ! $? -eq 0 ]]
then
  error "App linting failed"
fi

cd $DIR_API
echo "Lint api"
if [[ -z $DRY ]]
then
  npm run lint
fi 

if [[ ! $? -eq 0 ]]
then
  error "Api linting failed"
fi

cd $DIR_CUR

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


#--------------------------------------------------------------------------------
# Write changes 
#--------------------------------------------------------------------------------

MSG_HEAD_CHANGE="[${NEW_VERSION}](${REPO}/tree/${NEW_VERSION})"

echo "Write change header: $MSG_HEAD_CHANGE "

if [[ -z $DRY ]]
then

  echo -e "  - $MSG_HEAD_CHANGE \n"\
    > $CHANGELOG_TMP

  cat $CHANGELOG >> $CHANGELOG_TMP
  cp $CHANGELOG_TMP $CHANGELOG 

  vim $CHANGELOG

  echo "Get diff"
  git --no-pager diff --minimal

  echo "Verify git diff of versioning changes. Continue (commit, push) ? [YES/NO/EDIT]"

  while true; do
    read confirm_diff
    confirm_diff=$(echo "$confirm_diff" | awk '{print tolower($0)}')

    if [[ "$confirm_diff" == "yes" || "$confirm_diff" == "y" ]]; then
      echo "Proceeding with commit, build, and push."
      break
    elif [[ "$confirm_diff" == "no" || "$confirm_diff" == "n" ]]; then
      echo "Stop here, stash changes. rollback to $CUR_HASH"
      git stash
      exit 1
    elif [[ "$confirm_diff" == "edit" || "$confirm_diff" == "e" ]]; then
      echo "Re-editing the diff file."
      vim $CHANGELOG
      echo "Get diff"
      git --no-pager diff --minimal
      echo "Verify git diff of versioning changes. Continue (commit, push) ? [YES/NO/EDIT]"
    else
      echo "Invalid input. Please enter 'YES', 'NO', 'EDIT', 'y', 'n', or 'e':"
    fi
  done

fi

#--------------------------------------------------------------------------------
# Git commit 
#--------------------------------------------------------------------------------

echo "Commit"

if [[ -z $DRY ]]
then 

  git add .
  git commit -m "auto build version $NEW_VERSION"
  git tag $NEW_VERSION
  git push $REMOTE $BRANCH --tags

fi

echo "Done"
