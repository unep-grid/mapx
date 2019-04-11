#!/bin/sh

#
# Set default credential using custom variable
#
updateCred="<?xml version='1.0' encoding='UTF-8'?>\
  <userRegistry version='1.0' xmlns='http://www.geoserver.org/security/users'>\
  <users><user enabled='true' name='admin' password='plain:"${GEOSERVER_ADMIN_PASSWORD}"'/></users>\
  <groups/></userRegistry>" 


#
# If the data dir does not exist, import the default one, else, do nothing
#
if [ ! -d ${GEOSERVER_DATA_DIR}/security ]
then
  cp -R ${GEOSERVER_HOME}/data_dir ${GEOSERVER_DATA_DIR}
else
  echo "Data folder ${GEOSERVER_DATA_DIR} exists, don't copy default"
fi

#
# Update password, start the app
#
echo "Update default password"

echo ${updateCred} > ${GEOSERVER_DATA_DIR}/security/usergroup/default/users.xml

sh ${GEOSERVER_HOME}"/bin/startup.sh"

