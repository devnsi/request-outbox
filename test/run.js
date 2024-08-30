import { randomUUID } from 'crypto';
import { RequestOutbox } from "../request-outbox.js"

const requestOutbox = new RequestOutbox();

[...Array(10)].forEach(_ => {
    const id1 = randomUUID()
    requestOutbox.captured[id1] = {
        id: id1,
        capturedOn: new Date().toISOString(),
        targetUrl: "http://localhost:8080/200",
        headers: { "Content-Type": "application/json" },
        body: { "test": "value" }
    };
    const id2 = randomUUID()
    requestOutbox.captured[id2] = {
        id: id2,
        capturedOn: new Date().toISOString(),
        targetUrl: "http://localhost:8080/200/some-super-long-link-that-certainly-does-not-fit-well-into-the-ui",
        headers: { "Content-Type": "application/json" },
        body: { "test": "super-long" }
    };
    const id3 = randomUUID()
    requestOutbox.captured[id3] = {
        id: id3,
        capturedOn: new Date().toISOString(),
        targetUrl: "http://localhost:8080/401",
        headers: { "Content-Type": "application/json" },
        body: [
            {
                "_id": "66ce2f1d29741aa90a63808f",
                "index": 0,
                "guid": "4722b79b-21c8-4ac2-88d7-d21837e247da",
                "isActive": false,
                "balance": "$2,960.41",
                "age": 26,
                "eyeColor": "brown",
                "name": "Lucille Shepherd",
                "gender": "female"
            },
            {
                "_id": "66ce2f1dc0a740a296e6758c",
                "index": 1,
                "guid": "08abfa31-28e9-4c4d-ade0-602ca6ad32ba",
                "isActive": true,
                "balance": "$3,286.04",
                "age": 39,
                "eyeColor": "blue",
                "name": "Bette Melendez",
                "gender": "female"
            }
        ]
    };
})
