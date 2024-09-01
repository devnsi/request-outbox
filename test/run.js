import { RequestOutbox } from "../request-outbox.js"

class Testdata {
    postLong = {
        method: "POST",
        query: { targetUrl: "http://localhost:8080/200/some-super-long-link-that-certainly-does-not-fit-well-into-the-ui" },
        headers: { "Content-Type": "application/json", "Authorization": "Basic dXNlcjpwYXNzd29yZA==" },
        body: { "test": "super-long".padEnd(100, '_') }
    };

    getWithoutBody = {
        method: "GET",
        query: { targetUrl: "http://localhost:8080/200" },
        headers: { "Authorization": "Basic dXNlcjpwYXNzd29yZA==" },
        body: undefined
    };

    putWithBody = {
        method: "PUT",
        query: { targetUrl: "http://localhost:8080/401" },
        headers: undefined,
        body: [
            [...Array(10)].map(_ => ({
                "_id": "66ce2f1d29741aa90a63808f",
                "index": 0,
                "guid": "4722b79b-21c8-4ac2-88d7-d21837e247da",
                "isActive": false,
                "balance": "$2,960.41",
                "age": 26,
                "eyeColor": "brown",
                "name": "Lucille Shepherd",
                "gender": "female"
            })),
        ]
    };

    static resMock = ({
        status: (_) => ({ send: (_) => { } }),
    });

    requests = [...Array(5)].flatMap(_ => [
        this.postLong,
        this.getWithoutBody,
        this.putWithBody
    ])
}

const requestOutbox = new RequestOutbox();
const testdata = new Testdata().requests
testdata.forEach(req => requestOutbox.captureRequest(req, Testdata.resMock))
