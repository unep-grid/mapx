#!/usr/bin/env bash
#
# Upload a vector file (zipped shapefile, GeoPackage, GeoJSON, CSV...) to MapX
# through the HTTP route POST /upload/vector/, and optionally create a view.
#
# Internal use. The account must be publisher (or admin) of the target project.
#
# Credentials: in a browser logged into MapX, open the dev tools console:
#   mx.settings.user.id      -> MAPX_USER
#   mx.settings.user.token   -> MAPX_TOKEN  (valid for `cookieExpireDays`)
#   mx.settings.project.id   -> MAPX_PROJECT (or any project where you publish)
#
# Usage:
#   export MAPX_API="https://api.mapx.org"
#   export MAPX_USER=123
#   export MAPX_TOKEN="..."
#   export MAPX_PROJECT="MX-XXX-XXX-XXX-XXX-XXX"
#   ./upload_vector.sh data.zip "My layer title"
#
# Options (environment):
#   CREATE_VIEW=true|false      Create a view from the new source (default true)
#   ENABLE_DOWNLOAD=true|false  Allow source download (default false)
#   ENABLE_WMS=true|false       Publish with GeoServer (default false)
#   SOURCE_SRS=EPSG:XXXX        Assign SRS when the file has none (e.g. shp without .prj)
#   MAPX_LANGUAGE=en            Language of the title / notifications (default en)
#
# The response is a stream of JSON notifications separated by "\t\n".
# Exit status is non-zero when the request is rejected or an error is notified.

set -euo pipefail

FILE="${1:?Usage: $0 <file> <title>}"
TITLE="${2:?Usage: $0 <file> <title>}"

: "${MAPX_API:?MAPX_API is required}"
: "${MAPX_USER:?MAPX_USER is required}"
: "${MAPX_TOKEN:?MAPX_TOKEN is required}"
: "${MAPX_PROJECT:?MAPX_PROJECT is required}"

CREATE_VIEW="${CREATE_VIEW:-true}"
ENABLE_DOWNLOAD="${ENABLE_DOWNLOAD:-false}"
ENABLE_WMS="${ENABLE_WMS:-false}"
SOURCE_SRS="${SOURCE_SRS:-}"
MAPX_LANGUAGE="${MAPX_LANGUAGE:-en}"

if [[ ! -r "$FILE" ]]; then
  echo "Cannot read $FILE" >&2
  exit 1
fi

# The API uses the mime type to read zip archives through GDAL /vsizip/ :
# curl does not guess it, set it explicitly.
FILE_FIELD="vector=@${FILE}"
case "$(printf "%s" "$FILE" | tr "[:upper:]" "[:lower:]")" in
  *.zip) FILE_FIELD="${FILE_FIELD};type=application/zip" ;;
  *.csv) FILE_FIELD="${FILE_FIELD};type=text/csv" ;;
esac

SRS_FIELDS=(-F "assign_srs=false")
if [[ -n "$SOURCE_SRS" ]]; then
  SRS_FIELDS=(-F "assign_srs=true" -F "source_srs=${SOURCE_SRS}")
fi

if command -v jq >/dev/null 2>&1; then
  format() { jq -r '"[\(.level)] \(.message // "")\(if .value then " \(.value)%" else "" end)"' 2>/dev/null || cat; }
else
  format() { cat; }
fi

STATUS_MARK="__mapx_http_status__:"
has_error=0
http_status=""

while IFS= read -r line; do
  line="${line%$'\t'}"
  [[ -z "$line" ]] && continue
  if [[ "$line" == "$STATUS_MARK"* ]]; then
    http_status="${line#"$STATUS_MARK"}"
    continue
  fi
  if [[ "$line" == *'"level":"error"'* ]]; then
    has_error=1
  fi
  printf '%s\n' "$line" | format
done < <(
  curl -sS -N -X POST "${MAPX_API%/}/upload/vector/" \
    -F "idUser=${MAPX_USER}" \
    -F "token=${MAPX_TOKEN}" \
    -F "idProject=${MAPX_PROJECT}" \
    -F "title=${TITLE}" \
    -F "language=${MAPX_LANGUAGE}" \
    -F "create_view=${CREATE_VIEW}" \
    -F "enable_download=${ENABLE_DOWNLOAD}" \
    -F "enable_wms=${ENABLE_WMS}" \
    "${SRS_FIELDS[@]}" \
    -F "${FILE_FIELD}" \
    -w "\n${STATUS_MARK}%{http_code}\n"
)

if [[ "$http_status" != "200" ]]; then
  echo "Upload rejected (HTTP ${http_status:-?})" >&2
  exit 1
fi
if [[ "$has_error" -eq 1 ]]; then
  echo "Upload failed, see messages above" >&2
  exit 1
fi
echo "Upload done"
