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
    process.env.SUPABASE_SERVICE_KEY
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

            redirect: "/Dashboard"

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



// 2. Verify the Google email against your Supabase Profiles table and set the session
app.post("/auth/google-verify", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                registered: false,
                message: "Google email not received."
            });
        }


        // Normalize Google email
        const normalizedEmail =
            email.trim().toLowerCase();


        // ==========================================
        // CHECK EMAIL IN PROFILES TABLE
        // ==========================================

        const {
            data: profile,
            error
        } = await supabase
            .from("Profiles")
            .select("*")
            .eq("user_email", normalizedEmail)
            .maybeSingle();


        // ==========================================
        // DATABASE ERROR
        // ==========================================

        if (error) {

            console.error(
                "Google registration check error:",
                error
            );

            return res.status(500).json({
                registered: false,
                message:
                    "Unable to check registration."
            });
        }


        // ==========================================
        // EMAIL NOT REGISTERED
        // ==========================================

        if (!profile) {

            return res.status(200).json({
                registered: false,
                message:
                    "Google email is not registered."
            });
        }


        // ==========================================
        // EMAIL REGISTERED
        // ==========================================

        req.session.user = {
            username: profile.user_name,
            displayname: profile.display_name,
            email: profile.user_email
        };

        req.session.isAuthenticated = true;


        return res.status(200).json({

            registered: true,

            message:
                "Google login successful.",

            redirect: "/dashboard"

        });

    }

    catch (error) {

        console.error(
            "Google verification error:",
            error
        );

        return res.status(500).json({

            registered: false,

            message:
                "Google authentication service unavailable."

        });

    }

});


// 3. Ensure your /dashboard route passes the user session securely
app.get("/dashboard", (req, res) => {
    if (!req.session || !req.session.isAuthenticated) {
        return res.redirect("/login");
    }
    console.log(req.session.user);
    res.render("dashboard", { user: req.session.user || null});
});



app.get("/signin", (req, res) => {

    res.render("signin", {

        registrationEmail:
            req.session.registrationEmail || null

    });

});



app.post("/auth/google-registration", async (req, res) => {

    try {

        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                success: false,
                message: "Google authentication required."
            });

        }

        // Extract Supabase access token
        const accessToken =
            authHeader.substring("Bearer ".length);

        // Verify token with Supabase
        const {
            data,
            error
        } = await supabase.auth.getUser(accessToken);

        if (error || !data?.user) {

            console.error(
                "Google registration authentication error:",
                error
            );

            return res.status(401).json({
                success: false,
                message: "Invalid Google authentication."
            });

        }

        // Get verified Google email
        const googleEmail =
            data.user.email?.trim().toLowerCase();

        if (!googleEmail) {

            return res.status(400).json({
                success: false,
                message: "Google email could not be obtained."
            });

        }

        console.log(
            "Verified Google registration email:",
            googleEmail
        );

        // ==========================================
        // STORE VERIFIED EMAIL SERVER-SIDE
        // ==========================================

        req.session.registrationEmail =
            googleEmail;

        // Make sure this is NOT an authenticated login
        req.session.isAuthenticated = false;

        return res.status(200).json({

            success: true,

            email: googleEmail,

            redirect: "/signin"

        });

    }

    catch (error) {

        console.error(
            "Google registration error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to verify Google account."

        });

    }

});



app.get("/api/registration-status", (req, res) => {

    if (!req.session.registrationEmail) {

        return res.json({

            verified: false

        });

    }

    return res.json({

        verified: true,

        email:
            req.session.registrationEmail

    });

});



app.post("/register", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        // ==========================================
        // 1. GET VERIFIED EMAIL FROM SESSION
        // ==========================================

        const registrationEmail =
            req.session.registrationEmail;

        if (!registrationEmail) {

            return res.status(401).json({

                status: "error",

                message:
                    "Google email verification is required before registration."

            });

        }

        // ==========================================
        // 2. BASIC VALIDATION
        // ==========================================

        if (
            !username ||
            !password
        ) {

            return res.status(400).json({

                status: "error",

                message:
                    "Username and password are required."

            });

        }

        // ==========================================
        // 3. NORMALIZE DATA
        // ==========================================

        const normalizedEmail =
            registrationEmail.trim().toLowerCase();

        const normalizedUsername =
            username.trim();

        // ==========================================
        // 4. CHECK EMAIL
        // ==========================================

        const {
            data: existingEmail,
            error: emailCheckError
        } = await supabase
            .from("Profiles")
            .select("user_id")
            .eq("user_email", normalizedEmail)
            .maybeSingle();

        if (emailCheckError) {

            console.error(
                "Email check error:",
                emailCheckError
            );

            return res.status(500).json({

                status: "error",

                message:
                    "Unable to verify email."

            });

        }

        // ==========================================
        // 5. EMAIL ALREADY EXISTS
        // ==========================================

        if (existingEmail) {

            return res.status(409).json({

                status: "exists",

                field: "email",

                message:
                    "Email already exists."

            });

        }

        // ==========================================
        // 6. CHECK USERNAME
        // ==========================================

        const {
            data: existingUser,
            error: usernameCheckError
        } = await supabase
            .from("Profiles")
            .select("user_id")
            .eq("user_name", normalizedUsername)
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

        // ==========================================
        // 7. USERNAME ALREADY EXISTS
        // ==========================================

        if (existingUser) {

            return res.status(409).json({

                status: "exists",

                field: "username",

                message:
                    "Username already exists."

            });

        }

        // ==========================================
        // 8. CREATE SUPABASE AUTH USER
        // ==========================================

        const {
            data: authData,
            error: authError
        } = await supabase.auth.signUp({

            email: normalizedEmail,

            password: password,

            options: {

                data: {

                    username:
                        normalizedUsername

                }

            }

        });

        // ==========================================
        // 9. SUPABASE AUTH ERROR
        // ==========================================

        if (authError) {

            console.error(
                "Supabase Auth error:",
                authError
            );

            return res.status(400).json({

                status: "error",

                message:
                    authError.message

            });

        }

        // ==========================================
        // 10. SUCCESS
        // ==========================================

        console.log(
            "AUTH USER CREATED:",
            authData.user?.id
        );

        // Registration is complete.
        // Remove temporary Google registration email.

        delete req.session.registrationEmail;

        return res.status(200).json({

            status: "success",

            message:
                "Voter registered successfully."

        });

    }

    catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        return res.status(500).json({

            status: "error",

            message:
                "Registration service unavailable."

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
        
                supabasePublishableKey: process.env.SUPABASE_SERVICE_KEY
        
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
