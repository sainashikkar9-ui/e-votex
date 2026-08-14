import 'dotenv/config';
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();
const port = 5000;
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionSecret = process.env.SESSION_SECRET || "gpp-evm-development-session-secret";
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
app.use('/scripts', express.static(path.join(_dirname, '../scripts')));
app.use('/bootstrap', express.static(path.join(_dirname, '../node_modules/bootstrap/dist')))
app.use(session({
    secret: sessionSecret,
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
//  res.render("confirmedProt2");
});

app.get("/prot4", (req, res) => {
    const voteResponse = req.session.voteResponse || {};
    const partyName = voteResponse.partyName || "Common Off Janata Party";
    res.render("prot4", { partyName });
});

app.get("/confirmedVote", (req, res) => {
    const voteResponse = req.session.voteResponse || {};
    const partyName = voteResponse.partyName || "Common Off Janata Party";
    res.render("confirmed", { partyName });
});

app.post("/vote", (req, res) => {
    const selectedValue = req.body['yesCommonOff'] === '1' ? 'yes' : req.body['noCommonOff'] === '1' ? 'no' : null;

    if (!selectedValue) {
        return res.redirect("/");
    }

    const voteResponse = {
        selected: selectedValue,
        yesCommonOff: selectedValue === 'yes' ? 1 : 0,
        noCommonOff: selectedValue === 'no' ? 1 : 0,
        partyName: selectedValue === 'yes' ? "Common Off Janata Party" : "Full Attendance Janata Party"
    };

    req.session.voteResponse = voteResponse;
    return res.render("prot4", { partyName: voteResponse.partyName });
});

app.post("/confirmVote", async (req, res) => {
    const voteResponse = req.session.voteResponse || {};
    const yesCommonOff = voteResponse.yesCommonOff || 0;
    const noCommonOff = voteResponse.noCommonOff || 0;

    if (req.body['confirm'] === 'confirm') {
        try {
            if (yesCommonOff === 1) {
                await db.query('UPDATE "commonOffVote" SET yes = yes + 1 WHERE id = 1');
                const status = await db.query('SELECT yes FROM "commonOffVote"');
                console.log("Status : yes = " + status.rows[0].yes);
            }
            else {
                await db.query('UPDATE "commonOffVote" SET no = no + 1 WHERE id = 1');
                const status = await db.query('SELECT no FROM "commonOffVote"');
                console.log("Status : no = " + status.rows[0].no);
            }
            return res.redirect("/confirmedVote");
        } catch (err) {
            console.log(err);
            return res.status(500).send("Database error occured!");
        }
    }

    req.session.voteResponse = {};
    return res.redirect("/");
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
