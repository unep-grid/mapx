#!/bin/bash
CUR_VERSION=`cat version.txt`
CHANGELOG_FILE="CHANGELOG.md"
BASE_URL_CHANGELOG="https://github.com/fxi/map-x-mgl/tree/"
PREVIOUS_LOG=$(git log -3 --pretty=%B)
UPDATE_URL='-<a href="'$BASE_URL_CHANGELOG$CUR_VERSION'">'$CUR_VERSION'</a>'
UPDATE_TXT=$UPDATE_URL"\n"$PREVIOUS_LOG"\n"
CHANGES_CHECK=$(git status --porcelain | wc -l)
BRANCH=master
REMOTE=github

if [ $CHANGES_CHECK -gt 0 ]
then 
  echo "This project as uncommited changes, stop here"
  exit 1
fi

echo "---- EXTRACTED CHANGELOG ---"
echo $UPDATE_TXT
echo "----------------------------"

echo "Use the latest hash and message to upate the changelog ? [YES/NO]"
read confirm_changelog_edit

if [ "$confirm_changelog_edit" = "YES"  ]
then 
  # edit changelog
  mv $CHANGELOG_FILE $CHANGELOG_FILE"_tmp"
  echo -e $UPDATE_TXT > $CHANGELOG_FILE 
  cat $CHANGELOG_FILE"_tmp" >> $CHANGELOG_FILE 
  rm $CHANGELOG_FILE"_tmp"
  vim $CHANGELOG_FILE
  # Check changes
  git --no-pager diff --minimal 
  echo "Confirm changelog commit ? [YES/NO]"
  read confirm_changelog_commit

  if [ "$confirm_changelog_commit" = "YES"  ]
  then 
    git add .
    git commit -m "auto update changelog"
    git push $REMOTE $BRANCH
  else
    git checkout -- $CHANGELOG_FILE
  fi

fi

echo "Done"

