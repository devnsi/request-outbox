Request Outbox
===========

Capture requests and forward on manual release.

## Installation

### via npm

```shell
npm install -g request-outbox
```

This will install `request-outbox` as a command in your `PATH`. 
Discard the `-g` flag if you'd like to use it as project dependency.

### via source

```shell
git clone https://github.com/devnsi/request-outbox.git
cd request-outbox
npm install
npm start
```

## Starting the Server

```shell
[sudo] request-outbox
```

## Configuration

THe application can be configured by environment variables.

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
