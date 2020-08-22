#!/bin/bash

tail -n0 -F "$1" | while read LINE; do
  if [[ ! $LINE =~ "SSL_do_handshake() failed" ]]
  then
    (echo "$LINE" | grep -e "$3") && curl -X POST --silent --data-urlencode \
      "payload={\"text\": \"$(echo $LINE | sed "s/\"/'/g")\"}" "$2";
  fi
done
