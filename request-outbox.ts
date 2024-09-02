import { randomUUID } from 'crypto';
import axios, { AxiosRequestConfig} from 'axios';
import express, { Request, Response } from 'express';
import path from 'path';
import 'dotenv/config';
import cors from "cors";

const __dirname = path.resolve();
const client = axios.create({});

interface CapturedRequest {
    id: string;
    capturedOn: Date;
    method: string;
    targetUrl: string;
    headers: Record<string, string|string[]|undefined>;
    body: any;
    formatCapturedForDisplay(): string;
}

export class RequestOutbox {
    port: number;
    ttl: number;
    callback: string;
    forwardHeaders: string[];
    captured: Record<string, CapturedRequest>;
    server: any;

    constructor(autostart = true) {
        this.port = parseInt(process.env.PORT || '3000');
        this.ttl = process.env.TTL ? parseInt(process.env.TTL) : 300;
        this.callback = process.env.CALLBACK || `http://${process.env.HOSTNAME || "localhost"}:${this.port}`;
        this.forwardHeaders = (process.env.FORWARD_HEADERS || 'Authorization').split(',');
        this.captured = {};

        setInterval(() => this.evictOutdated(), 1000);
        if (autostart) this.start();
    }

    start(): void {
        const app = express();
        const port = this.port;

        app.use(express.json());
        app.use(cors());
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        app.get('/', (req: Request, res: Response) => this.emitWebsite(req, res));
        app.get('/favicon.ico', (req: Request, res: Response) => this.emitIcon(req, res));
        app.all('/capture', (req: Request, res: Response) => this.captureRequest(req, res));
        app.post('/manage', (req: Request, res: Response) => this.manageRequests(req, res));

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

    stop(): void {
        this.server?.close();
    }

    emitWebsite(_: Request, res: Response): void {
        res.render('manage', {
            callback: `${this.callback}/manage`,
            entries: Object.values(this.captured).sort((a, b) => b.capturedOn.getTime() - a.capturedOn.getTime())
        });
    }

    emitIcon(_: Request, res: Response): void {
        const iconPath = path.join(__dirname, '/views/favicon.ico');
        res.sendFile(iconPath);
    }

    captureRequest(req: Request, res: Response): void {
        try {
            const targetUrl = req.query.targetUrl as string;
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
        } catch (error) {
            console.warn(`Capturing request failed.`, error);
            res.status(500).send({
                error: "capturing request failed",
                details: error
            });
        }
    }

    extractRequestHeaders(req: Request): Record<string, string|string[]|undefined> {
        if (!req.headers) return {};
        const allowed = (key: string) => this.forwardHeaders.map(h => h.trim().toLowerCase()).includes(key.toLowerCase());
        const matches = Object.keys(req.headers).filter(allowed)
        const headers = matches.map(key => [key, req.headers[key]]);
        return Object.fromEntries(headers);
    }

    extractRequestBody(req: Request): any {
        return req.body;
    }

    respondOnCapture(req: Request, res: Response, entry: CapturedRequest): void {
        res.status(200).send(entry);
    }

    evictOutdated(): void {
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

    async manageRequests(req: Request, res: Response): Promise<void> {
        console.log("Received manage request", req.body);
        try {
            for (const id of req.body.allowed || []) {
                const entry = this.captured[id];
                await this.forward(entry, id, res);
            }
        } catch (error) {
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
    }

    async forward(entry: CapturedRequest, id: string, res: Response): Promise<void> {
        const response = await client.request(<AxiosRequestConfig>{
            method: entry.method,
            url: entry.targetUrl,
            headers: entry.headers,
            data: entry.body,
            timeout: 10 * 1000,
        });
        console.log(`Forwarded '${id}':`, response.status, response.status >= 400 ? response.data : response.statusText);
        delete this.captured[id];
    }
}

class CapturedRequestImpl implements CapturedRequest {
    id: string;
    capturedOn: Date;
    method: string;
    targetUrl: string;
    headers: Record<string, string|string[]|undefined>;
    body: any;

    constructor(req: Request, headers: Record<string, string|string[]|undefined>, body: any) {
        this.id = randomUUID();
        this.capturedOn = new Date();
        this.method = req.method;
        this.targetUrl = req.query.targetUrl as string;
        this.headers = headers;
        this.body = body;
    }

    formatCapturedForDisplay(): string {
        const headline = `${this.method} ${this.targetUrl}`;
        const headers = Object.keys(this.headers)
            .sort((a, b) => a.localeCompare(b))
            .map(key => `${key}: ${this.headers[key]}`).join('\n');
        const headersMargin = headers ? '\n\n' : '';
        const body = JSON.stringify(this.body, null, 2) ?? '';
        const bodyMargin = body ? '\n\n' : '';
        return headline + headersMargin + headers + bodyMargin + body;
    }
}
