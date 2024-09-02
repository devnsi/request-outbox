var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { randomUUID } from 'crypto';
import axios from 'axios';
import express from 'express';
import path from 'path';
import 'dotenv/config';
import cors from "cors";
const __dirname = path.resolve();
const client = axios.create({});
export class RequestOutbox {
    constructor(autostart = true) {
        this.port = parseInt(process.env.PORT || '3000');
        this.ttl = process.env.TTL ? parseInt(process.env.TTL) : 300;
        this.callback = process.env.CALLBACK || `http://${process.env.HOSTNAME || "localhost"}:${this.port}`;
        this.forwardHeaders = (process.env.FORWARD_HEADERS || 'Authorization').split(',');
        this.captured = {};
        setInterval(() => this.evictOutdated(), 1000);
        if (autostart)
            this.start();
    }
    start() {
        const app = express();
        const port = this.port;
        app.use(express.json());
        app.use(cors());
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));
        app.get('/', (req, res) => this.emitWebsite(req, res));
        app.get('/favicon.ico', (req, res) => this.emitIcon(req, res));
        app.all('/capture', (req, res) => this.captureRequest(req, res));
        app.post('/manage', (req, res) => this.manageRequests(req, res));
        this.server = app.listen(port, () => {
            console.log(`Listening on port ${port}...`);
            console.log(`Capturing requests on endpoint ${this.callback}/capture?targetUrl=original-url...`);
            console.log("Configuration", {
                PORT: port,
                TTL: this.ttl,
                CALLBACK: this.callback,
                FORWARD_HEADERS: this.forwardHeaders
            });
        });
    }
    stop() {
        var _a;
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.close();
    }
    emitWebsite(_, res) {
        res.render('manage', {
            callback: `${this.callback}/manage`,
            entries: Object.values(this.captured).sort((a, b) => b.capturedOn.getTime() - a.capturedOn.getTime())
        });
    }
    emitIcon(_, res) {
        const iconPath = path.join(__dirname, '/views/favicon.ico');
        res.sendFile(iconPath);
    }
    captureRequest(req, res) {
        try {
            const targetUrl = req.query.targetUrl;
            if (!targetUrl) {
                res.status(404).send({ error: 'missing targetUrl query parameter' });
                return;
            }
            const headers = this.extractRequestHeaders(req);
            const body = this.extractRequestBody(req);
            const entry = new CapturedRequestImpl(req, headers, body);
            this.captured[entry.id] = entry;
            console.log(`Captured request '${entry.id}'.`);
            this.respondOnCapture(req, res, entry);
        }
        catch (error) {
            console.warn(`Capturing request failed.`, error);
            res.status(500).send({
                error: "capturing request failed",
                details: error
            });
        }
    }
    extractRequestHeaders(req) {
        if (!req.headers)
            return {};
        const allowed = (key) => this.forwardHeaders.map(h => h.trim().toLowerCase()).includes(key.toLowerCase());
        const matches = Object.keys(req.headers).filter(allowed);
        const headers = matches.map(key => [key, req.headers[key]]);
        return Object.fromEntries(headers);
    }
    extractRequestBody(req) {
        return req.body;
    }
    respondOnCapture(req, res, entry) {
        res.status(200).send(entry);
    }
    evictOutdated() {
        const threshold = new Date(Date.now() - this.ttl * 1000).getTime();
        for (const key of Object.keys(this.captured)) {
            const entry = this.captured[key];
            const outOfDate = entry.capturedOn ? entry.capturedOn.getTime() < threshold : false;
            if (outOfDate) {
                console.log(`Evict '${key}'.`);
                delete this.captured[key];
            }
        }
    }
    manageRequests(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Received manage request", req.body);
            try {
                for (const id of req.body.allowed || []) {
                    const entry = this.captured[id];
                    yield this.forward(entry, id, res);
                }
            }
            catch (error) {
                const responseError = { status: error.status, request: `${error.config.method} ${error.config.url}`, response: error.response.data };
                console.error('Forwarding failed.', responseError);
                res.status(500).send(responseError).end();
                return;
            }
            for (const id of req.body.deleted || []) {
                console.log(`Deleting '${id}'`);
                delete this.captured[id];
            }
            console.log("Remaining entries", Object.keys(this.captured));
            res.status(200).end();
        });
    }
    forward(entry, id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield client.request({
                method: entry.method,
                url: entry.targetUrl,
                headers: entry.headers,
                data: entry.body,
                timeout: 10 * 1000,
            });
            console.log(`Forwarded '${id}':`, response.status, response.status >= 400 ? response.data : response.statusText);
            delete this.captured[id];
        });
    }
}
class CapturedRequestImpl {
    constructor(req, headers, body) {
        this.id = randomUUID();
        this.capturedOn = new Date();
        this.method = req.method;
        this.targetUrl = req.query.targetUrl;
        this.headers = headers;
        this.body = body;
    }
    formatCapturedForDisplay() {
        var _a;
        const headline = `${this.method} ${this.targetUrl}`;
        const headers = Object.keys(this.headers)
            .sort((a, b) => a.localeCompare(b))
            .map(key => `${key}: ${this.headers[key]}`).join('\n');
        const headersMargin = headers ? '\n\n' : '';
        const body = (_a = JSON.stringify(this.body, null, 2)) !== null && _a !== void 0 ? _a : '';
        const bodyMargin = body ? '\n\n' : '';
        return headline + headersMargin + headers + bodyMargin + body;
    }
}
//# sourceMappingURL=request-outbox.js.map