#!/bin/sh

updateCred="<?xml version='1.0' encoding='UTF-8'?>\
<userRegistry version='1.0' xmlns='http://www.geoserver.org/security/users'>\
<users><user enabled='true' name='admin' password='plain:"${GEOSERVER_ADMIN_PASSWORD}"'/></users>\
<groups/></userRegistry>" 

echo ${GEOSERVER_DATA_DIR} 
echo ${GEOSERVER_HOME} 

echo ${updateCred} > ${GEOSERVER_DATA_DIR}/security/usergroup/default/users.xml

cat ${GEOSERVER_HOME}"/bin/startup.sh"

sh ${GEOSERVER_HOME}"/bin/startup.sh"

