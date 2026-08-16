import 'dotenv/config';
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = 5000;
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionSecret = process.env.SESSION_SECRET || "gpp-evm-development-session-secret";
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    connectionTimeoutMillis: 5000
});
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

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
app.use(express.json());



app.set("view engine", "ejs");
app.set("views", path.join(_dirname, "../views"));



app.get("/", (req, res) => {
    res.redirect("/login");
});



app.get("/login", (req, res) => {
    res.render("login");
});



app.get("/signin", (req, res) => {
    res.render("signin");
    console.log(req.body);
});



app.post("/register", async (req, res) => {

    try {

        const {
            email,
            username,
            password
        } = req.body;

        console.log("EMAIL:", email);
        console.log("USERNAME:", username);
        console.log("PASSWORD:", password);


        // ==========================================
        // 2. Check username
        // ==========================================

        const {
            data: existingUser,
            error: checkError
        } = await supabase
            .from("Profiles")
            .select("user_id")
            .eq("user_name", username)
            .maybeSingle();


        if (checkError) {

            console.error(
                "Username check error:",
                checkError
            );

            return res.status(500).json({
                status: "error",
                message: "Unable to verify username."
            });

        }


        // ==========================================
        // 3. Username already exists
        // ==========================================

        if (existingUser) {

            return res.status(409).json({
                status: "exists",
                message: "Voter already exists."
            });

        }


        // ==========================================
        // 4. Create Supabase Auth user
        // ==========================================

        const {
            data: authData,
            error: authError
        } = await supabase.auth.signUp({

            email: email,

            password: password,

            options: {
                data: {
                    username: username
                }
            }

        });


        // ==========================================
        // 5. Supabase Auth error
        // ==========================================

        if (authError) {

            console.error(
                "Supabase Auth error:",
                authError
            );

            return res.status(400).json({
                status: "error",
                message: authError.message
            });

        }


        // ==========================================
        // 6. SUCCESS
        // ==========================================

        console.log(
            "AUTH USER CREATED:",
            authData.user.id
        );


        return res.status(200).json({
            status: "success",
            message: "Voter registered successfully."
        });

    }

    catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        return res.status(500).json({
            status: "error",
            message: "Registration service unavailable."
        });

    }

});


app.get("/test", async (req, res) => {
    if (req.session.isVoted === 3) {
        res.redirect("/confirmed");
    }
    else {
                res.render("signin", {
        
                supabaseUrl: process.env.SUPABASE_URL,
        
                supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY
        
            });
        
//        res.render("index");
        req.session.isVoted = 1;
    }
});



app.post("/vote", (req, res) => {

    if (req.session.isVoted === 1) {
        req.session.voteResponse = req.body["yesCommonOff"] || req.body["noCommonOff"];
        const partyName = req.session.voteResponse;
        res.render("confirmVote", { partyName });
        console.log('Entered /vote 2');
        req.session.isVoted = 2;
    }

    else if (req.session.isVoted === 3) {
        res.redirect("/confirmed");
    }

    else {
        res.redirect("/");
    }
});



app.post("/confirmVote", async (req, res) => {
    if (req.session.isVoted === 2) {
        const partyName = req.session.voteResponse;
        const buttonName = req.body["edit"] || req.body["confirm"];

        console.log('Entered /confirmVote 3');


        if (buttonName === 'confirm') {
            try {
                if (partyName === "Common Off Janata Party") {
                    await db.query('UPDATE "commonOffVote" SET yes = yes + 1 WHERE id = 1');
                    const status = await db.query('SELECT yes FROM "commonOffVote"');
                    console.log("Status : yes = " + status.rows[0].yes);
                    console.log("Done db 1");
                    req.session.isVoted = 3;
                }
                else {
                    await db.query('UPDATE "commonOffVote" SET no = no + 1 WHERE id = 1');
                    const status = await db.query('SELECT no FROM "commonOffVote"');
                    console.log("Status : no = " + status.rows[0].no);
                    console.log("Done db 2");
                    req.session.isVoted = 3;
                }
                return res.redirect("/confirmed");
            } catch (err) {
                console.log(err);
                return res.status(500).send("Database error occured!");
            }
        }

        else {
            return res.redirect("/");
        }
    }

    else if (req.session.isVoted === 3) { res.redirect("/confirmed"); }

    else { res.redirect("/"); }
});



app.get("/confirmed", (req, res) => {
    if (req.session.isVoted === 3) {
        const partyName = req.session.voteResponse;
        res.render("confirmed", { partyName });
        console.log('Entered /confirmed 4');
    }
    else {
        res.redirect("/");
    }
    console.log("Session ID:", req.sessionID);
    console.log("Session:", req.session);
});



app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
