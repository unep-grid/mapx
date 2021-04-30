#!/bin/sh

mkdir -p _shared/userdata
mkdir -p _shared/download
mkdir -p _shared/geoserver
mkdir -p _shared/postgres

echo "1. './_shared' directory and subdirectories created (only if missing)..."

if [ ! -f mapx.dev.env ]
then
  cp -p mapx.dev.EXAMPLE.env mapx.dev.env
	echo "2. './mapx.dev.EXAMPLE.env' file was copied as './mapx.dev.env'..."
fi
