import 'dotenv/config';
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();
const port = 5000;
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "GPP_EVM",
    password: "Sai@2009",
    port: 3000,
    connectionTimeoutMillis: 5000
});

db.connect();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(_dirname + "/../public"));
app.use('/bootstrap', express.static(path.join(_dirname, '../node_modules/bootstrap/dist')))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));
app.set("view engine", "ejs");
app.set("views", path.join(_dirname, "../views"));
//console.log("Checking Session : " + process.env.SESSION_SECRET);

//    let yesCommonOff = 0;
//    let noCommonOff = 0;

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/vote", (req, res) => {
    let yesCommonOff = 0;
    let noCommonOff = 0;
    if (!req.sessionID.voteResponse) {
        req.session.voteResponse = { yesCommonOff, noCommonOff };
    }

    if (req.body['yesCommonOff'] === '1') {
        req.session.voteResponse.yesCommonOff = ++yesCommonOff;
        console.log("yesCommonOff : ", yesCommonOff);
    }
    else {
        req.session.voteResponse.noCommonOff = ++noCommonOff;
        console.log("noCommonOff : ", noCommonOff);
    }
    res.render("confirmVote");
});

app.post("/confirmVote", async (req, res) => {
    let yesCommonOff = req.session.voteResponse.yesCommonOff;
    let noCommonOff = req.session.voteResponse.noCommonOff;


    if (req.body['confirm'] === 'confirm') {
        try {
            if (yesCommonOff === 1) {
                await db.query('UPDATE "commonOffVote" SET yes = yes + 1 WHERE id = 1');
                let status = await db.query('SELECT yes FROM "commonOffVote"');
                console.log("Status : yes = " + status.rows[0].yes);
                res.send("Status : yes = " + status.rows[0].yes);
            }
            else {
                await db.query('UPDATE "commonOffVote" SET no = no + 1 WHERE id = 1');
                let status = await db.query('SELECT no FROM "commonOffVote"');
                console.log("Status : no = " + status.rows[0].no);
                res.send("Status : no = " + status.rows[0].no);
            }
        } catch (err) {
            console.log(err);
            res.sendStatus(500).send("Database error occured!");
        }
    }
    else {
        yesCommonOff = 0;
        noCommonOff = 0;
        req.session.voteResponse.yesCommonOff = yesCommonOff;
        req.session.voteResponse.noCommonOff = noCommonOff;
        res.redirect("/");
    }
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});