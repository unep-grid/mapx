Map-x project using mapbox gl js.


# Create stack

```sh
docker-compose up
```

# Backup

```sh
#!/bin/bash
# make data dir
mkdir -p shared
# volume to archive
docker run --rm -v mx_data:/data  busybox sh -c 'tar -cOzf - /data' > mx_data.tgz | tar -xvf -C shared
# dir to volume
sudo docker run --rm -v /shared/:/shared -v mxdata:/data busybox sh -c 'cp -R /shared/* /data/'
# cp dir to volume
docker cp shared/geoserver 26ce42d3358e:/shared/geoserver
``


