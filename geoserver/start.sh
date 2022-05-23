#!/bin/sh

#
# Set default credential using variable
#
ADMIN_XML=$(cat << EOF
  <?xml version='1.0' encoding='UTF-8'?>
  <userRegistry version='1.0' xmlns='http://www.geoserver.org/security/users'>
  <users>
  <user enabled='true' name='admin' password='plain:$GEOSERVER_ADMIN_PASSWORD'/>
  </users>
  <groups/>
  </userRegistry>
EOF
)

#
# Set defaut settings using variables
#
GLOBAL_XML=$(cat << EOF
<global>
  <settings>
    <id>SettingsInfoImpl-68f6c583:154ca420c47:-8000</id>
    <contact>
      <addressCity>$GEOSERVER_CONTACT_CITY</addressCity>
      <addressCountry>$GEOSERVER_CONTACT_COUNTRY</addressCountry>
      <addressType>Work</addressType>
      <contactEmail>$GEOSERVER_CONTACT_EMAIL</contactEmail>
      <contactOrganization>$GEOSERVER_CONTACT_ORGANISATION</contactOrganization>
      <contactPerson>$GEOSERVER_CONTACT_PERSON</contactPerson>
      <contactPosition>$GEOSERVER_CONTACT_PERSON_POSITION</contactPosition>
    </contact>
    <charset>UTF-8</charset>
    <numDecimals>8</numDecimals>
    <onlineResource>http://geoserver.org</onlineResource>
    <proxyBaseUrl>$GEOSERVER_URL_PUBLIC</proxyBaseUrl>
    <verbose>false</verbose>
    <verboseExceptions>false</verboseExceptions>
    <metadata>
      <map>
        <entry>
          <string>quietOnNotFound</string>
          <boolean>false</boolean>
        </entry>
      </map>
    </metadata>
    <localWorkspaceIncludesPrefix>false</localWorkspaceIncludesPrefix>
    <showCreatedTimeColumnsInAdminList>false</showCreatedTimeColumnsInAdminList>
    <showModifiedTimeColumnsInAdminList>false</showModifiedTimeColumnsInAdminList>
  </settings>
  <jai>
    <allowInterpolation>false</allowInterpolation>
    <recycling>false</recycling>
    <tilePriority>5</tilePriority>
    <tileThreads>7</tileThreads>
    <memoryCapacity>0.5</memoryCapacity>
    <memoryThreshold>0.75</memoryThreshold>
    <imageIOCache>false</imageIOCache>
    <pngAcceleration>true</pngAcceleration>
    <jpegAcceleration>true</jpegAcceleration>
    <allowNativeMosaic>false</allowNativeMosaic>
    <allowNativeWarp>false</allowNativeWarp>
    <jaiext>
      <jaiExtOperations class="sorted-set">
        <string>Affine</string>
        <string>BandCombine</string>
        <string>BandMerge</string>
        <string>BandSelect</string>
        <string>Binarize</string>
        <string>Border</string>
        <string>ColorConvert</string>
        <string>Crop</string>
        <string>ErrorDiffusion</string>
        <string>Format</string>
        <string>ImageFunction</string>
        <string>Lookup</string>
        <string>Mosaic</string>
        <string>Null</string>
        <string>OrderedDither</string>
        <string>Rescale</string>
        <string>Scale</string>
        <string>Stats</string>
        <string>Translate</string>
        <string>Warp</string>
        <string>algebric</string>
        <string>operationConst</string>
      </jaiExtOperations>
    </jaiext>
  </jai>
  <coverageAccess>
    <maxPoolSize>10</maxPoolSize>
    <corePoolSize>5</corePoolSize>
    <keepAliveTime>30000</keepAliveTime>
    <queueType>UNBOUNDED</queueType>
    <imageIOCacheThreshold>10240</imageIOCacheThreshold>
  </coverageAccess>
  <updateSequence>64323</updateSequence>
  <featureTypeCacheSize>0</featureTypeCacheSize>
  <globalServices>true</globalServices>
  <xmlPostRequestLogBufferSize>1024</xmlPostRequestLogBufferSize>
  <xmlExternalEntitiesEnabled>false</xmlExternalEntitiesEnabled>
  <webUIMode>DEFAULT</webUIMode>
</global>
EOF
)

#
# If the data dir does not exist, import the default one, else, do nothing
#
if [ ! -d ${GEOSERVER_DATA_DIR}/security ]
then
  cp -R ${GEOSERVER_HOME}/data_dir/* ${GEOSERVER_DATA_DIR}/
else
  echo "Data folder ${GEOSERVER_DATA_DIR} exists, don't copy default"
fi

#
# Update password, start the app
#
echo ${ADMIN_XML} > ${GEOSERVER_DATA_DIR}/security/usergroup/default/users.xml

#
# Update settings global 
#
echo ${GLOBAL_XML} > ${GEOSERVER_DATA_DIR}/global.xml 


sh ${GEOSERVER_HOME}"/bin/startup.sh"

