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
            .select("user_email, user_name")
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


// Add this route to handle the frontend check after Google authentication
// Corrected route for /auth/google/check in server.js
app.get("/auth/google/check", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ registered: false, message: "Not authenticated with Google." });
        }

        const { data: profile, error } = await supabase
            .from("Profiles")
            .select("user_email, user_name")
            .eq("user_email", req.session.user.email)
            .maybeSingle();

        if (error || !profile) {
            return res.status(200).json({ 
                registered: false, 
                message: "Email not registered. Please sign up." 
            });
        }

        return res.status(200).json({ 
            registered: true, 
            redirect: "/dashboard" 
        });
    } catch (err) {
        console.error("Google check error:", err);
        return res.status(500).json({ registered: false, message: "Server error during registration check." });
    }
});



// 1. Handle the redirect from Google cleanly
app.get("/google-callback", (req, res) => {
    // Supabase passes tokens via URL hash on the frontend, 
    // so we redirect back to /login where the client SDK captures it.
    res.redirect("/login");
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
            .select("user_email, user_name")
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
    res.render("dashboard", { user: req.session.user || null });
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
        // 1. BASIC SERVER-SIDE VALIDATION
        // ==========================================

        if (
            !email ||
            !username ||
            !password
        ) {

            return res.status(400).json({

                status: "error",

                message:
                    "Email, username and password are required."

            });

        }


        // ==========================================
        // 2. NORMALIZE EMAIL / USERNAME
        // ==========================================

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedUsername =
            username.trim();


        // ==========================================
        // 3. CHECK EMAIL
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
        // 4. EMAIL ALREADY EXISTS
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
        // 5. CHECK USERNAME
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
        // 6. USERNAME ALREADY EXISTS
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
        // 7. CREATE SUPABASE AUTH USER
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
        // 8. SUPABASE AUTH ERROR
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
        // 9. SUCCESS
        // ==========================================

        console.log(
            "AUTH USER CREATED:",
            authData.user?.id
        );


        return res.status(200).json({

            status: "success",

            message:
                "Voter registered successfully."

        });

    }


    // ==========================================
    // 10. UNEXPECTED SERVER ERROR
    // ==========================================

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



/*
app.get("/dashboard", (req, res) => {
    res.render("dashboard", { user: req.session?.user || null });
});
*/



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
