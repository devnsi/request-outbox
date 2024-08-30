import express from 'express'
import cors from 'cors'

export class Mock {
    requested = undefined;

    constructor() {
        this.start()
    }

    start() {
        const app = express()
        const port = 8080
        app.use(express.json())
        app.use(cors())
        app.post('/*', (req, res) => this.mock(req, res))
        this.server = app.listen(port, () => {
            console.log(`Mock listening on port ${port}...`);
        });
    }

    stop() {
        this.server?.close()
    }

    mock(req, res) {
        console.log("Mock received on", req.originalUrl)
        this.requested = req
        if (req.originalUrl == "/200")
            res.status(200).send({ "stub": "success" }).end()
        else if (req.originalUrl == "/401")
            res.status(401).send({ "stub": "error" }).end()
        else
            res.status(200).end()
    }
}
