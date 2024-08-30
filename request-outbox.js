import { randomUUID } from 'crypto';
import axios from 'axios'
import express from 'express'
import path from 'path'
import cors from 'cors'
import 'dotenv/config'
const __dirname = import.meta.dirname;

/**
 * Middleware webserver to capture requests.
 * Inspect captured requests in web-based user interface.
 * Release requests to the original target.
 */
export class RequestOutbox {
    port = process.env.PORT || 3000
    /** Time to live of captured requests in seconds (before they are discarded). */
    ttl = process.env.TTL ? parseInt(process.env.TTL) : 300 // in seconds.
    /** Callback where to reach the server. */
    callback = process.env.CALLBACK || `http://${process.env.HOSTNAME || "localhost"}:${this.port}`
    /** Headers from the captured request to be transmitted to the target on release. */
    forwardHeaders = (process.env.FORWARD_HEADERS || 'Authorization').split(',')

    captured = {}

    constructor(autostart = true) {
        setInterval(() => this.evictOutdated(), 1000)
        if (autostart) this.start()
    }

    /** Start the server (if not automatically started on construction). */
    start() {
        const app = express()
        const port = this.port

        app.use(express.json())
        app.use(cors())
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        /** Show outbox contents. */
        app.get('/', (req, res) => this.emitWebsite(req, res))
        app.get('/favicon.ico', (req, res) => this.emitIcon(req, res))
        app.post('/capture', (req, res) => this.captureRequest(req, res))
        app.post('/manage', (req, res) => this.manageRequests(req, res))

        this.server = app.listen(port, () => {
            console.log(`Listening on port ${port}...`);
            console.log(`Capturing requests on endpoint ${this.callback}/capture?targetUrl=original-url...`);
            console.log("Configuration", {
                PORT: port,
                TTL: this.ttl,
                CALLBACK: this.callback,
                FORWARD_HEADERS: this.forwardHeaders
            })
        });
    }

    /** Stop the server. */
    stop() {
        this.server?.close()
    }

    /** Publish website to manage outbox. */
    emitWebsite(_, res) {
        res.render('manage', {
            callback: `${this.callback}/manage`,
            entries: Object.keys(this.captured).map(id => this.captured[id]),
        });
    }

    emitIcon(_, res) {
        const iconPath = path.join(__dirname, '/views/favicon.ico');
        return res.sendFile(iconPath);
    }

    /** Capture requests so they can be inspected and released. */
    captureRequest(req, res) {
        try {
            const targetUrl = req.query.targetUrl;
            if (!targetUrl) res.status(404).send({ error: 'missing targetUrl query parameter' });
            const id = randomUUID();
            const entry = {
                id: id,
                capturedOn: new Date().toISOString(),
                targetUrl: targetUrl,
                headers: this.extractRequestHeaders(req),
                body: this.extractRequestBody(req)
            };
            this.captured[id] = entry
            console.log(`Captured request '${id}'.`)
            this.respondOnCapture(req, res, entry)
        } catch (error) {
            res.status(500).send({
                error: "capturing request failed",
                details: error
            })
        }
    }

    /** Extract and transform header to sent to original target (e.g. auth information). */
    extractRequestHeaders(req) {
        const allowed = ([key, _]) => this.forwardHeaders.map(h => h.trim().toLowerCase()).includes(key.toLowerCase());
        const headers = Object.entries(req.headers).filter(allowed);
        return Object.fromEntries(headers);
    }

    /** Extract and transform request body to sent to original target (e.g. modify values). */
    extractRequestBody(req) {
        return req.body
    }

    /** Formulate response for the captured request. */
    respondOnCapture(req, res, entry) {
        res.status(200).send(entry)
    }

    /** Remove outdated requests. */
    evictOutdated() {
        const threshold = new Date(Date.now() - this.ttl * 1000).getTime()
        for (const key of Object.keys(this.captured)) {
            const entry = this.captured[key]
            const outOfDate = entry.capturedOn ? entry.capturedOn < threshold : false
            if (outOfDate) {
                console.log(`Evict '${key}'.`)
                delete this.captured[key]
            }
        }
    }

    /** Manage capture requests. */
    async manageRequests(req, res) {
        console.log("Received manage request", req.body);
        for (const id of req.body.allowed || []) {
            const entry = this.captured[id];
            await this.forward(entry, id, res);
        }
        for (const id of req.body.deleted || []) {
            console.log(`Deleting '${id}'`);
            delete this.captured[id];
        }
        console.log("Remaining entries", Object.keys(this.captured));
        res.status(200);
        res.end();
    }

    async forward(entry, id, res) {
        try {
            const response = await axios.post(entry.targetUrl, entry.body, {
                headers: entry.headers,
                timeout: 10 * 1000,
                validateStatus: (_) => true // don't throw errors.
            });
            console.log(`Forwarded '${id}':`, response.status, response.status >= 400 ? response.data : response.statusText);
            delete this.captured[id];
        } catch (error) {
            const responseError = { error: error.code };
            console.error(`Forwarding '${id}' failed: ${error.code}.`);
            res.status(500).send(responseError).end();
        }
    }
}
