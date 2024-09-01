Request Outbox
===========

Capture requests and forward on manual release.

Configure the origin to send requests to the outbox instead of the target.
Use the query parameter targetUrl to specify the originally target.
Inspect requests in the user interface of the outbox.
Release the request to the target or discard the request.

Customize the behavior (e.g. requests, responses) by using the [API](#Programmatic-API).

## Installation

### via npm

```shell
npm install -g request-outbox
```

This will install `request-outbox` as a command in your `PATH`. 
Discard the `-g` flag if you'd like to use it as project dependency.

### via docker

```shell
docker run -d --rm --name request-box -p 3000:3000 -e CALLBACK=http://localhost:3000 devnsi/request-outbox:latest
docker logs request-box
start http://localhost:3000
```

See [Dockerhub](https://hub.docker.com/r/devnsi/request-outbox) for available tags.

### via source

```shell
git clone https://github.com/devnsi/request-outbox.git
cd request-outbox
npm install
npm start
```

## Configuration

The application can be configured by environment variables.

## Programmatic API

Add `request-outbox` as a module within your project's directory:

```shell
npm install request-outbox
```

Then within your project files you can do something like:

```javascript
import { RequestOutbox } from "request-outbox";

const requestOutbox = new RequestOutbox(false); // to disable automatic start up.
requestOutbox.forwardHeaders = ["authorization"]; // or by environment variables.
requestOutbox.start();
...
requestOutbox.stop();
```
