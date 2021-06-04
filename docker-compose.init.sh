#!/bin/sh

echo "1. create './_shared' directory and subdirectories,  if missing..."

mkdir -p _shared/userdata
mkdir -p _shared/download
mkdir -p _shared/geoserver
mkdir -p _shared/postgres

if [ ! -f mapx.dev.env ]
then
  cp -p mapx.dev.EXAMPLE.env mapx.dev.env
	echo "2. './mapx.dev.EXAMPLE.env' file was copied as './mapx.dev.env'..."
fi
