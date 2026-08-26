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
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
            persistSession: false, // <-- THIS FIXES THE 2ND ACCOUNT ERROR
            autoRefreshToken: false
        }
    }
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
    //    res.redirect("/dashboard/create-poll");
});



app.get("/login", (req, res) => {

    res.render("login", {

        supabaseUrl:
            process.env.SUPABASE_URL,

        supabasePublishableKey:
            process.env.SUPABASE_PUBLISHABLE_KEY

    });

});



app.post("/loginCheck", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;


        /* =====================================================
           BASIC VALIDATION
        ===================================================== */

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });

        }


        /* =====================================================
           NORMALIZE USERNAME
        ===================================================== */

        const normalizedUsername = username.trim();

        /* =====================================================
           FIND USERNAME IN PROFILES TABLE
        ===================================================== */

        const {
            data: Profiles,
            error: ProfilesError
        } = await supabase
            .from("Profiles")
            .select("*")
            .eq("user_name", normalizedUsername)
            .maybeSingle();


        /* =====================================================
           PROFILE DATABASE ERROR
        ===================================================== */

        if (ProfilesError) {

            console.error(
                "Profile lookup error:",
                ProfilesError
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify account."
            });

        }


        /* =====================================================
           USERNAME DOES NOT EXIST
        ===================================================== */

        if (!Profiles) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        /* =====================================================
           VERIFY PASSWORD USING SUPABASE AUTH
        ===================================================== */

        const {
            data: authData,
            error: authError
        } = await supabase.auth.signInWithPassword({

            email: Profiles.user_email,

            password: password

        });


        /* =====================================================
           AUTHENTICATION FAILED
        ===================================================== */

        if (authError || !authData?.user) {

            console.log(
                "Supabase login failed:",
                authError?.message
            );

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        /* =====================================================
           CREATE EXPRESS SESSION
        ===================================================== */

        req.session.user = {

            id: authData.user.id,

            username: Profiles.user_name,

            displayname: Profiles.display_name,

            email: Profiles.user_email

        };


        req.session.isAuthenticated = true;


        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(200).json({

            success: true,

            message:
                "Login successful. Redirecting to dashboard...",

            redirect: "/dashboard"

        });

    }


    /* =========================================================
       UNEXPECTED ERROR
    ========================================================= */

    catch (error) {

        console.error(
            "POST /loginCheck error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Authentication service unavailable."

        });

    }

});



app.get("/signin", (req, res) => {

    res.render("signin", {

        supabaseUrl:
            process.env.SUPABASE_URL,

        supabasePublishableKey:
            process.env.SUPABASE_PUBLISHABLE_KEY

    });

});



app.post("/auth/google-registration", async (req, res) => {

    try {

        /* ========================================================
           GET ACCESS TOKEN
        ======================================================== */

        const authorization =
            req.headers.authorization;


        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                success: false,

                registered: false,

                message:
                    "Google authentication token missing."

            });

        }


        const accessToken =
            authorization.substring(
                "Bearer ".length
            );


        /* ========================================================
           VERIFY TOKEN WITH SUPABASE
        ======================================================== */

        const {
            data: userData,
            error: userError
        } =
            await supabase.auth.getUser(
                accessToken
            );


        if (
            userError ||
            !userData?.user
        ) {

            console.error(
                "Google user verification error:",
                userError
            );


            return res.status(401).json({

                success: false,

                registered: false,

                message:
                    "Google account verification failed."

            });

        }


        const googleUser =
            userData.user;


        const googleEmail =
            googleUser.email;


        if (!googleEmail) {

            return res.status(400).json({

                success: false,

                registered: false,

                message:
                    "Google account does not contain an email."

            });

        }


        const normalizedEmail =
            googleEmail
                .trim()
                .toLowerCase();


        /* ========================================================
           CHECK PROFILES
        ======================================================== */

        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("Profiles")
                .select(
                    "*"
                )
                .eq(
                    "user_email",
                    normalizedEmail
                )
                .maybeSingle();


        if (profileError) {

            console.error(
                "Google profile lookup error:",
                profileError
            );


            return res.status(500).json({

                success: false,

                registered: false,

                message:
                    "Unable to verify registration."

            });

        }


        /* ========================================================
           EMAIL ALREADY REGISTERED
        ======================================================== */

        if (profile) {

            req.session.user = {

                id:
                    googleUser.id,

                username:
                    profile.user_name,

                displayname:
                    profile.display_name,

                email:
                    profile.user_email

            };


            req.session.isAuthenticated =
                true;


            return res.status(200).json({

                success: true,

                registered: true,

                message:
                    "Google login successful.",

                redirect:
                    "/dashboard"

            });

        }


        /* ========================================================
           EMAIL NOT REGISTERED
           
           STORE VERIFIED GOOGLE ACCOUNT TEMPORARILY
        ======================================================== */

        req.session.registration = {

            googleUserId:
                googleUser.id,

            email:
                normalizedEmail

        };


        /*
         * Make sure the session is saved before
         * sending the response.
         */

        await new Promise(
            (resolve, reject) => {

                req.session.save(
                    error => {

                        if (error) {

                            reject(error);

                        }

                        else {

                            resolve();

                        }

                    }
                );

            }
        );


        return res.status(200).json({

            success: true,

            registered: false,

            registrationPending:
                true,

            email:
                normalizedEmail,

            message:
                "Google email verified. Complete registration."

        });

    }

    catch (error) {

        console.error(
            "POST /auth/google-registration error:",
            error
        );


        return res.status(500).json({

            success: false,

            registered: false,

            message:
                "Google registration service unavailable."

        });

    }

});



app.get("/api/registration-status", (req, res) => {

    const registration = req.session.registration;

    if (
        !registration ||
        !registration.googleUserId ||
        !registration.email
    ) {

        return res.json({
            verified: false
        });

    }

    return res.json({

        verified: true,

        email: registration.email

    });

});



app.post("/register", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;


        /* ========================================================
           CHECK GOOGLE REGISTRATION SESSION
        ======================================================== */

        const registration =
            req.session.registration;


        if (
            !registration ||
            !registration.googleUserId ||
            !registration.email
        ) {

            return res.status(401).json({

                status: "error",

                message:
                    "Google email verification is required before registration."

            });

        }


        const normalizedEmail =
            registration.email
                .trim()
                .toLowerCase();


        const normalizedUsername =
            String(username || "")
                .trim();


        /* ========================================================
           BASIC VALIDATION
        ======================================================== */

        if (
            !normalizedUsername ||
            !password
        ) {

            return res.status(400).json({

                status: "error",

                message:
                    "Username and password are required."

            });

        }


        if (
            normalizedUsername.length < 3
        ) {

            return res.status(400).json({

                status: "error",

                message:
                    "Username must contain at least 3 characters."

            });

        }


        /* ========================================================
           CHECK USERNAME
        ======================================================== */

        const {
            data: existingUser,
            error: usernameCheckError
        } =
            await supabase
                .from("Profiles")
                .select("*")
                .eq(
                    "user_name",
                    normalizedUsername
                )
                .maybeSingle();


        if (usernameCheckError) {

            console.error(
                "Username check error:",
                usernameCheckError
            );


            return res.status(500).json({

                status: "error",

                message:
                    "Unable to verify username."

            });

        }


        /* ========================================================
           USERNAME ALREADY EXISTS
        ======================================================== */

        if (existingUser) {

            return res.status(409).json({

                status: "exists",

                field: "username",

                message:
                    "Username already exists."

            });

        }


        /* ========================================================
           VERIFY AUTH USER STILL EXISTS
        ======================================================== */

        const {
            data: authUserData,
            error: authUserError
        } =
            await supabase.auth.admin.getUserById(
                registration.googleUserId
            );


        if (
            authUserError ||
            !authUserData?.user
        ) {

            console.error(
                "Google Auth user lookup error:",
                authUserError
            );


            return res.status(401).json({

                status: "error",

                message:
                    "Google verification session has expired. Please verify again."

            });

        }


        const authUser =
            authUserData.user;

        /* ========================================================
            GET GOOGLE DISPLAY NAME
        ======================================================== */

        const googleDisplayName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.user_metadata?.display_name ||
            normalizedEmail.split("@")[0];

        /* ========================================================
           MAKE SURE EMAIL MATCHES
        ======================================================== */

        if (
            authUser.email?.trim().toLowerCase() !==
            normalizedEmail
        ) {

            console.error(
                "Google email mismatch."
            );


            return res.status(403).json({

                status: "error",

                message:
                    "Verified Google account mismatch."

            });

        }


        /* ========================================================
           SET PASSWORD ON EXISTING GOOGLE AUTH USER
        ======================================================== */

        const {
            data: updatedAuthData,
            error: passwordError
        } =
            await supabase.auth.admin.updateUserById(

                registration.googleUserId,

                {
                    password:
                        password,

                    user_metadata: {

                        username:
                            normalizedUsername,

                        display_name:
                            normalizedUsername

                    }

                }

            );


        if (passwordError) {

            console.error(
                "Password update error:",
                passwordError
            );


            return res.status(400).json({

                status: "error",

                message:
                    "Unable to create account password."

            });

        }


        /* ========================================================
           CREATE PROFILE
        ======================================================== */

        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("Profiles")
                .insert({
                    user_id: registration.googleUserId, // (Or 'id' depending on what your column is named)
                    user_email: normalizedEmail,
                    user_name: normalizedUsername,
                    display_name: googleDisplayName
                })
                .select()
                .single();


        /* ========================================================
           PROFILE INSERT FAILED
        ======================================================== */

        if (profileError) {

            console.error(
                "Profile creation error:",
                profileError
            );


            /*
             * IMPORTANT:
             *
             * Password was already set on Auth.
             * We don't want to silently continue.
             */

            return res.status(500).json({

                status: "error",

                message:
                    "Account authentication was created, but profile creation failed. Please contact support."

            });

        }


        /* ========================================================
           CREATE EXPRESS SESSION
        ======================================================== */

        req.session.user = {

            id:
                registration.googleUserId,

            username:
                profile.user_name,

            displayname:
                profile.display_name,

            email:
                profile.user_email

        };


        req.session.isAuthenticated =
            true;


        /*
         * Registration is complete.
        */

        await new Promise(
            (resolve, reject) => {

                req.session.save(
                    error => {

                        if (error) {

                            reject(error);

                        }

                        else {

                            resolve();

                        }

                    }
                );

            }
        );


        /* ========================================================
           SUCCESS
        ======================================================== */

        return res.status(200).json({

            status: "success",

            message:
                "Voter registered successfully.",

            redirect:
                "/dashboard"

        });

    }

    catch (error) {

        console.error(
            "POST /register error:",
            error
        );


        return res.status(500).json({

            status: "error",

            message:
                "Registration service unavailable."

        });

    }

});



app.get("/dashboard", (req, res) => {
    if (!req.session || !req.session.isAuthenticated) {
        return res.redirect("/login");
    }
    console.log(req.session.user);
    res.render("dashboard", { user: req.session.user || null });
});



app.get("/dashboard/create-poll", (req, res) => {
    res.render("create-poll");
});



app.post("/dashboard/create-poll/create-url", (req, res) => {

    const title = req.session.title = req.body.title;
    const description = req.session.description = req.body.captions;
    const option1 = req.session.option1 = req.body.option1;
    const option2 = req.session.option2 = req.body.option2;
    const option3 = req.session.option3 = req.body.option3;
    const option4 = req.session.option4 = req.body.option4;

    console.log(req.session.title);
    console.log(req.session.captions);
    console.log(req.session.option1);
    console.log(req.session.option2);
    console.log(req.session.option3);
    console.log(req.session.option4);

    res.render("create-url", { user: { title, description, option1, option2, option3, option4 } });

});



app.post("/dashboard/create-poll/create-url/created-url", async (req, res) => {
    try {
        const title = req.session.title;
        const description = req.session.description;
        const option1 = req.session.option1 || null;
        const option2 = req.session.option2 || null;
        const option3 = req.session.option3 || null;
        const option4 = req.session.option4 || null;
        const options = [option1, option2, option3, option4].filter(Boolean);
        const starts_at = new Date(req.body.startDateTime.trim().replace(" ", "T") + "+05:30");
        const ends_at = new Date(req.body.endDateTime.trim().replace(" ", "T") + "+05:30");
        const randomIndex = Math.floor(Math.random() * 51);
        let status = '';
        let election_code = '';
        let election_id = '';
        const now = new Date();
        const { data: happyMessage, error: happyMessageError } = await supabase
            .from("Happymessages")
            .select("poll_message");

        if (happyMessageError) {
            console.error("happyMessage fetching Error :", happyMessageError);
            return res.status(500).send("Unable to fetch from Happymessages.");
        }

        const happy_message = happyMessage[randomIndex].poll_message;

        /*Status Logic*/
        if (now >= ends_at) {
            status = "⚫ Ended";
        }
        else if (now >= starts_at) {
            status = "🟢 Active";
        }
        else {
            status = "🔴 Not Started";
        }



        if (req.body.submit === 'submit') {
            const { data: elections, error: electionsError } = await supabase
                .from("Elections")
                .insert({ creator_id: req.session.user.id, title, description, starts_at: starts_at.toISOString(), ends_at: ends_at.toISOString(), status })
                .select("election_id")
                .single();

            if (electionsError) {
                console.error("Election_data Insertion error:", electionsError);
                return res.status(500).send("Unable to insert in Elections.");
            }
            election_id = elections.election_id;

            const optionRows = options.map((value, index) => ({
                election_id: election_id,
                option_no: index + 1,
                option_name: value
            }));

            const { data: vote_options, error: vote_optionsError } = await supabase
                .from("Vote_options")
                .insert(optionRows);

            if (vote_optionsError) {
                console.error("Election_data Insertion error:", vote_optionsError);
                return res.status(500).send("Unable to insert in Vote_options.");
            }

            const { data: electionCode, error: electionCodeError } = await supabase
                .from("Elections")
                .select("passcode")
                .eq("election_id", election_id)
                .single();

            if (electionCodeError) {
                console.error("Election code error:", electionCodeError);
                return res.status(500).send("Unable to fetch election code.");
            }

            election_code = req.session.electionCode = electionCode.passcode;

            req.session.createdPoll = {
                title,
                description,
                starts_at,
                ends_at,
                status,
                happy_message,
                electionCode: election_code
            };

            return res.redirect("/dashboard/create-poll/create-url/created-url");
        }
        else {
            console.log(req.session.isAuthenticated);
            res.redirect("/dashboard");
        }
    }
    catch (error) {

        console.error(
            "POST /dashboard/create-poll/create-url/created-url error:",
            error
        );


        return res.status(500).json({

            status: "error",

            message:
                "Failed to create poll URL."

        });

    }
});



app.get("/dashboard/create-poll/create-url/created-url", (req,res) => {
    const poll = req.session.createdPoll;

    if (!poll) {
        return res.redirect("/dashboard");
    }

    res.render("created-url", {user: poll});
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
