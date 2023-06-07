#!/bin/sh

LAYER_FILE=$1
LAYER_NAME=$2
SRC_SRS=$3
CSV_MODE=$4
OPT=""
LCO=""
NLT=""


if [ "$CSV_MODE" == "yes" ]
then
  OPT=$OPT' -oo AUTODETECT_TYPE=YES'
else
  OPT=$OPT' -t_srs EPSG:4326'
  if [ -n "$SRC_SRS" ]
  then
    OPT=$OPT' -s_srs EPSG:'$SRC_SRS''
  fi 
  OPT=$OPT' -geomfield geom'
  OPT=$OPT' -makevalid'
  LCO=' -lco GEOMETRY_NAME=geom'
  NLT=' -nlt PROMOTE_TO_MULTI'
fi

echo 'CSV mode '$CSV_MODE
echo 'OPT '$OPT
echo 'LCO '$LCO
echo 'NLT '$NLT



PG_USE_COPY=YES \
  ogr2ogr \
  -progress \
  -skipfailures \
  -unsetFid \
  $OPT \
  -f PGDump \
  /vsistdout/ \
  $1 \
  -nln $2 \
  $NLT \
  -lco FID=gid \
  -lco SCHEMA=public \
  -lco CREATE_SCHEMA=OFF \
  -lco DROP_TABLE=OFF \
  -lco PRECISION=NO \
  $LCO \
  | \
  PGPASSWORD=$POSTGRES_USER_WRITE_PASSWORD \
  psql \
  -d $POSTGRES_DB \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER_WRITE \
  -f \
  -

