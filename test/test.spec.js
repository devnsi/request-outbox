import { deepEqual, equal, match, notEqual, ok } from 'assert';
import { RequestOutbox } from "../request-outbox.js"
import { Mock } from './mock.js';
import axios from 'axios';

const base = "http://localhost:3000"
const stub = "http://localhost:8080"
let requestOutbox
let targetDouble

beforeEach(() => {
    requestOutbox = new RequestOutbox(false);
    requestOutbox.forwardHeaders = ["Authorization"]
    requestOutbox.start()
    targetDouble = new Mock()
})

afterEach(() => {
    requestOutbox.stop()
    targetDouble.stop()
})

describe('RequestOutbox', () => {
    describe('index', () => {
        it('should return website', async () => {
            const response = await axios.get(base)
            const sources = response.data
            match(sources, /Request Outbox/);
        });
    });

    describe('capture', () => {
        it('should capture request', async () => {
            // given
            const request = { "scenario": "should capture request" }
            const targetUrl = `${stub}/200`
            const headers = { Authorization: "Basic dXNlcjpwYXNzd29yZA==", Example: "test" }
            // when
            const response = await axios.post(`${base}/capture?targetUrl=${targetUrl}`, request, { headers })
            // then
            const entry = response.data
            console.log("Captured Entry", entry)
            equal(entry.targetUrl, targetUrl);
            equal(entry.headers.authorization, headers.Authorization);
            equal(entry.headers.example, undefined);
            deepEqual(entry.body, request);
        });

        it('should show captured request on website', async () => {
            const targetUrl = "indicator-value-for-test"
            await axios.post(`${base}/capture?targetUrl=${targetUrl}`)
            onWebsite(targetUrl)
        });
    });

    describe('manage', () => {
        it('should release', async () => {
            // given
            const request = { scenario: "should release" }
            const targetUrl = `${stub}/200`
            const headers = { Authorization: "Basic dXNlcjpwYXNzd29yZA==" }
            const response = await axios.post(`${base}/capture?targetUrl=${targetUrl}`, request, { headers })
            const entry = response.data
            onWebsite(request.scenario)
            // when
            const allowed = [entry.id]
            const deleted = []
            await axios.post(`${base}/manage`, { allowed, deleted })
            // then
            ok(targetDouble.requested)
            equal(targetDouble.requested.headers.authorization, headers.Authorization)
            notOnWebsite(request.scenario)
        });

        it('should delete', async () => {
            // given
            const indicator = "should-delete"
            const response = await axios.post(`${base}/capture?targetUrl=${indicator}`)
            const entry = response.data
            onWebsite(indicator)
            // when
            const allowed = []
            const deleted = [entry.id]
            await axios.post(`${base}/manage`, { allowed, deleted })
            // then
            notOnWebsite(indicator)
        });
    });
});

async function onWebsite(indicator) {
    const website = await axios.get(base)
    const sources = website.data + ""
    ok(sources.includes(indicator));
}

async function notOnWebsite(indicator) {
    const website = await axios.get(base)
    const sources = website.data + ""
    ok(sources.includes(indicator));
}
