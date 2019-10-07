#!/bin/sh

LAYER_FILE=$1
LAYER_NAME=$2
SRC_SRS=$3
SRS_DEF=4326

if [ -z "$SRC_SRS" ]
then
  SRC_SRS=$SRS_DEF
fi

PG_USE_COPY=YES \
  ogr2ogr \
  -progress \
  -skipfailures \
  -t_srs EPSG:4326 \
  -s_srs EPSG:$SRC_SRS \
  -geomfield geom \
  -f PGDump \
  /vsistdout/ \
  $1 \
  -nln $2 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=public \
  -lco CREATE_SCHEMA=OFF \
  -lco DROP_TABLE=OFF \
  -lco PRECISION=NO \
  | \
  PGPASSWORD=$POSTGRES_USER_WRITE_PASSWORD \
  psql \
  -d $POSTGRES_DB \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER_WRITE \
  -f \
  -

