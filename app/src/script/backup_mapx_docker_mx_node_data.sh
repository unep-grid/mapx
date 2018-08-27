#!/bin/bash
mapxDump="/home/ubuntu/map-x-backup-"$(date +'%H')".dump.gz"
docker exec c4e692 pg_dumpall -U postgres | gzip > mapxDump