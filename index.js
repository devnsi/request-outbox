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
    ttl = process.env.TTL ? parseInt(process.env.TTL) : 300 // in seconds.
    callbackBase = process.env.CALLBACK || `http://${process.env.HOSTNAME || "localhost"}:${this.port}`
    callback = `${this.callbackBase}/manage`
    forwardHeaders = (process.env.FORWARD_HEADERS || '').split(',').map(h => h.trim().toLowerCase())
    entries = {}

    constructor(autostart = true) {
        setInterval(() => this.evictOutdated(), 1000)
        if (autostart) this.start()
    }

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

        app.listen(port, () => {
            console.log(`Listening on port ${port}...`);
            console.log(`Capturing requests on endpoint ${this.callbackBase}/capture?targetUrl=original-url...`);
        });
    }

    /** Publish website to manage outbox. */
    emitWebsite(_, res) {
        res.render('manage', {
            callback: this.callback,
            entries: Object.keys(this.entries).map(id => this.entries[id]),
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
                capturedOn: Date.now(),
                targetUrl: targetUrl,
                headers: this.extractRequestHeaders(req),
                body: this.extractRequestBody(req)
            };
            this.entries[id] = entry
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
        const allowed = ([key, _])  => this.forwardHeaders.includes(key.toLowerCase());
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
        for (const key of Object.keys(this.entries)) {
            const entry = this.entries[key]
            const outOfDate = entry.capturedOn ? entry.capturedOn < threshold : false
            if (outOfDate) {
                console.log(`Evict '${key}'.`)
                delete this.entries[key]
            }
        }
    }

    /** Manage capture requests. */
    async manageRequests(req, res) {
        console.log("Received manage request", req.body);
        for (const id of req.body.allowed || []) {
            const entry = this.entries[id];
            await this.forward(entry, id, res);
        }
        for (const id of req.body.deleted || []) {
            console.log(`Deleting '${id}'`);
            delete this.entries[id];
        }
        console.log("Remaining entries", Object.keys(this.entries));
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
            delete this.entries[id];
        } catch (error) {
            const responseError = { error: error.code };
            console.error(`Forwarding '${id}' failed: ${error.code}.`);
            res.status(500).send(responseError).end();
        }
    }
}
