#!/usr/bin/env bash
# Publishes the tail of a step log as a check-run annotation, so failures are
# readable through the GitHub REST API (the coding session can't open job logs).
log="${1:-ci.log}"
[ -f "$log" ] || { echo "::error title=CI failed::No log file $log"; exit 0; }
body=$(tail -c 6000 "$log" | sed -e 's/%/%25/g' -e 's/\r/%0D/g' | awk 'BEGIN{ORS="%0A"} {print}')
echo "::error title=CI failed (last lines of log)::${body}"
