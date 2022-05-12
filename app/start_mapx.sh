#!/bin/sh

echo "START MAPX"
exec Rscript run.R $SHINY_PORT
