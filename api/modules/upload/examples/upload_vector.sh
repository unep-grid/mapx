#!/usr/bin/env bash
# shellcheck shell=bash
#
# Source this file, then call upload_mapx:
#
#   source api/modules/upload/examples/upload_vector.sh
#   upload_mapx data/*.gpkg
#   upload_mapx --host api.staging.mapx.org --no-create-view data.zip
#
# MAPX_API, MAPX_USER, MAPX_TOKEN and MAPX_PROJECT are required defaults. MapX
# can copy them from the vector uploader. Options passed to upload_mapx override
# the environment for that invocation only. The account must be a publisher in
# the target project; MAPX_TOKEN is a sensitive, temporary session credential.

upload_mapx() (
  set -o pipefail

  local api="${MAPX_API:-}"
  local user="${MAPX_USER:-}"
  local token="${MAPX_TOKEN:-}"
  local project="${MAPX_PROJECT:-}"
  local language="${MAPX_LANGUAGE:-en}"
  local create_view="${CREATE_VIEW:-true}"
  local enable_download="${ENABLE_DOWNLOAD:-false}"
  local enable_wms="${ENABLE_WMS:-false}"
  local source_srs="${SOURCE_SRS:-}"
  local explicit_title=""
  local -a files=()

  _mapx_upload_usage() {
    cat <<'USAGE'
Usage: upload_mapx [options] <file> [file...]

Options override the corresponding environment defaults:
  --host URL                 API base URL (MAPX_API; bare hosts use HTTPS)
  --user ID                  MapX user id (MAPX_USER)
  --token TOKEN              MapX session token (MAPX_TOKEN)
  --project ID               Target project id (MAPX_PROJECT)
  --language CODE            Notification/title language (default: en)
  --srs EPSG:XXXX            Assign an SRS when the source has none
  --title TITLE              Source title; valid with one file only
  --create-view              Create a view (default)
  --no-create-view           Do not create a view
  --enable-download          Allow source download
  --no-enable-download       Do not allow source download (default)
  --enable-wms               Publish through GeoServer
  --no-enable-wms            Do not publish through GeoServer (default)
  --help                     Show this help

Files are uploaded sequentially. Without --title, each title is the filename
without its final extension. Processing continues after individual failures.
USAGE
  }

  _mapx_upload_option_value() {
    local option="$1"
    local count="$2"
    if ((count < 2)); then
      printf 'upload_mapx: %s requires a value\n' "$option" >&2
      return 2
    fi
  }

  while (($#)); do
    case "$1" in
      --host | --user | --token | --project | --language | --srs | --title)
        _mapx_upload_option_value "$1" "$#" || return
        case "$1" in
          --host) api="$2" ;;
          --user) user="$2" ;;
          --token) token="$2" ;;
          --project) project="$2" ;;
          --language) language="$2" ;;
          --srs) source_srs="$2" ;;
          --title) explicit_title="$2" ;;
        esac
        shift 2
        ;;
      --create-view)
        create_view=true
        shift
        ;;
      --no-create-view)
        create_view=false
        shift
        ;;
      --enable-download)
        enable_download=true
        shift
        ;;
      --no-enable-download)
        enable_download=false
        shift
        ;;
      --enable-wms)
        enable_wms=true
        shift
        ;;
      --no-enable-wms)
        enable_wms=false
        shift
        ;;
      --help)
        _mapx_upload_usage
        return 0
        ;;
      --)
        shift
        files+=("$@")
        break
        ;;
      -*)
        printf 'upload_mapx: unknown option: %s\n' "$1" >&2
        _mapx_upload_usage >&2
        return 2
        ;;
      *)
        files+=("$1")
        shift
        ;;
    esac
  done

  if ((${#files[@]} == 0)); then
    printf 'upload_mapx: at least one file is required\n' >&2
    _mapx_upload_usage >&2
    return 2
  fi
  if [[ -n "$explicit_title" ]] && ((${#files[@]} != 1)); then
    printf 'upload_mapx: --title can only be used with one file\n' >&2
    return 2
  fi
  if [[ -z "$api" || -z "$user" || -z "$token" || -z "$project" ]]; then
    printf 'upload_mapx: MAPX_API, MAPX_USER, MAPX_TOKEN and MAPX_PROJECT are required\n' >&2
    return 2
  fi
  if ! command -v curl >/dev/null 2>&1; then
    printf 'upload_mapx: curl is required\n' >&2
    return 2
  fi
  if [[ "$api" != *"://"* ]]; then
    api="https://${api}"
  fi
  api="${api%/}"

  _mapx_upload_one() {
    local file="$1"
    local title="$2"
    local file_field="vector=@${file}"
    local -a srs_fields=(-F "assign_srs=false")
    local status_mark="__mapx_http_status__:"
    local has_error=0
    local http_status=""
    local line formatted

    case "$file" in
      *.zip | *.ZIP) file_field="${file_field};type=application/zip" ;;
      *.csv | *.CSV) file_field="${file_field};type=text/csv" ;;
    esac
    if [[ -n "$source_srs" ]]; then
      srs_fields=(-F "assign_srs=true" -F "source_srs=${source_srs}")
    fi

    while IFS= read -r line; do
      line="${line%$'\t'}"
      [[ -z "$line" ]] && continue
      if [[ "$line" == "$status_mark"* ]]; then
        http_status="${line#"$status_mark"}"
        continue
      fi
      if [[ "$line" == *'"level":"error"'* ]]; then
        has_error=1
      fi
      if command -v jq >/dev/null 2>&1 &&
        formatted="$(printf '%s\n' "$line" | jq -r '"[\(.level)] \(.message // "")\(if .value then " \(.value)%" else "" end)"' 2>/dev/null)"; then
        printf '%s\n' "$formatted"
      else
        printf '%s\n' "$line"
      fi
    done < <(
      curl -sS -N -X POST "${api}/upload/vector/" \
        -F "idUser=${user}" \
        -F "token=${token}" \
        -F "idProject=${project}" \
        -F "title=${title}" \
        -F "language=${language}" \
        -F "create_view=${create_view}" \
        -F "enable_download=${enable_download}" \
        -F "enable_wms=${enable_wms}" \
        "${srs_fields[@]}" \
        -F "$file_field" \
        -w "\n${status_mark}%{http_code}\n"
    )

    if [[ "$http_status" != "200" ]]; then
      printf 'Upload rejected for %s (HTTP %s)\n' "$file" "${http_status:-?}" >&2
      return 1
    fi
    if ((has_error)); then
      printf 'Upload failed for %s; see messages above\n' "$file" >&2
      return 1
    fi
    printf 'Upload done: %s\n' "$file"
  }

  local total=${#files[@]}
  local succeeded=0
  local failed=0
  local file basename title
  for file in "${files[@]}"; do
    if [[ ! -r "$file" || ! -f "$file" ]]; then
      printf 'upload_mapx: cannot read file: %s\n' "$file" >&2
      ((failed += 1))
      continue
    fi
    basename="${file##*/}"
    title="${basename%.*}"
    [[ -n "$title" ]] || title="$basename"
    [[ -z "$explicit_title" ]] || title="$explicit_title"

    printf 'Uploading %s as %s\n' "$file" "$title"
    if _mapx_upload_one "$file" "$title"; then
      ((succeeded += 1))
    else
      ((failed += 1))
    fi
  done

  printf 'Summary: %s total, %s succeeded, %s failed\n' \
    "$total" "$succeeded" "$failed"
  ((failed == 0))
)

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  printf 'This file defines upload_mapx and must be sourced:\n' >&2
  printf '  source %q\n' "$0" >&2
  exit 2
fi
