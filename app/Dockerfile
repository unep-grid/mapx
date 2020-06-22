FROM fredmoser/debian_r3.5.1_shinyserver1.5.7.890



# Overwrite SockJSAdapter.R by a custom version:
# Remove _ga refs
# Add a mode where if the string 'mx-no-shiny' is found,
# no script is injected in head
#
COPY ./src/r/scripts/SockJSAdapter.R /opt/shiny-server/R/SockJSAdapter.R

#
# Add MapX files
#
COPY . /srv/shiny-server/mapx

#
# Add start script
#
COPY ./start_mapx.sh /usr/bin/start_mapx.sh

CMD ["sh","/usr/bin/start_mapx.sh"]

