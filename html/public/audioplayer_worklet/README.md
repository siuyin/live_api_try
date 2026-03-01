# Playing a prerecorded file over websockets
This uses an audio worklet.
Communication is over websockets.

## Audio worklets require a secure context
Localhost is considered secure.

The docker compose file is to create an nginx
reverse proxy that exposes https://localhost:8443
or https://192.168.1.122:8443 etc depending on your
assigned IP address.

The nginx instance uses a self-signed (snakeoil)
certificate that will raise warnings that the cert
is invalid. However most browsers allow you to ingore the
warning and proceed. The result is a secure (https) context.
