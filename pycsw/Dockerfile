# Thin MapX layer over the pinned pycsw image.
#
# The upstream digest is intentionally immutable. It currently provides an
# amd64 image only; see README.md before changing the build platforms.
FROM geopython/pycsw@sha256:442dc8ac95a3b4fcd0852f5f8d7cb760203f00cfea7a0f903a66f5791118cba4

COPY --chown=pycsw:pycsw pycsw.yml /etc/pycsw/pycsw.yml
COPY --chown=pycsw:pycsw mappings.py /etc/pycsw/mappings.py
COPY --chown=pycsw:pycsw templates /etc/pycsw/templates
