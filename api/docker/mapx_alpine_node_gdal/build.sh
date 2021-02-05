#!/bin/bash

NODE_VERSION=15.8.0
GDAL_VERSION=3.1.3
docker build -t fredmoser/mapx_alpine_node_gdal:node${NODE_VERSION}gdal${GDAL_VERSION} .
