# 🗳️ E-VOTEX

### Digital Voting and Poll Management Web Application

**E-VOTEX** is a web-based digital voting application developed to provide a simple, structured, and secure platform for creating polls and collecting votes electronically. The application allows users to authenticate themselves, create polls with multiple options, share a unique poll link, vote through that link, and view the final results after the configured polling period ends.

🔗 **Live Application:** https://e-votex-one.vercel.app/

---

## 👨‍💻 Developer

**Sai Avinash Nashikkar**

E-VOTEX was developed as a practical Web Technology project to understand and implement a complete database-driven web application, including authentication, sessions, dynamic pages, database operations, voting logic, and deployment.

---

## ✨ Features

* 🔐 User Login
* 🔵 Continue with Google
* 📝 Create a new account
* 📊 User Dashboard
* 🗳️ Create and manage polls
* 🔗 Generate a unique poll link
* 👥 Share the poll link with voters
* ✅ Authenticated voting
* ☑️ Select and confirm a voting option
* 🚫 Voting automatically closes after `end_time`
* 📈 Results become available after the poll ends
* 🔄 Results are displayed through the **same poll link**
* 🛡️ One-vote-per-user mechanism for a poll

---

# 🔑 Application Workflow

## 1. Login / Continue with Google / Create Account

When a user opens E-VOTEX, they can authenticate using their existing account. The application provides a standard login mechanism as well as **Continue with Google** authentication. New users can create an account and then access the application's features.

Authentication ensures that voting and poll-related activities can be associated with an authenticated user.

---

## 2. Dashboard

After successful authentication, the user enters the **Dashboard**.

The dashboard acts as the central area from which users can access poll-related functionality. A user can create a new poll and manage the polling workflow from this interface.

---

## 3. Create Poll

The user can create a poll by entering the required information, such as:

* Poll title
* Poll description
* Voting options
* Start time
* End time

The poll information is stored in the application's database and associated with the authenticated creator.

---

## 4. Poll Link Generation

After creating a poll, E-VOTEX provides a unique link for accessing that particular poll.

The generated link acts as the entry point for voters. Instead of requiring voters to navigate through the entire application, the poll creator can directly share the generated link.

Example:

```text
https://e-votex-one.vercel.app/vote/<poll-code>
```

The unique poll identifier allows the application to determine which election the voter is attempting to access.

---

# 🗳️ Voting Workflow

## 5. Visiting the Voting Poll Link

A voter can open the poll link shared by the poll creator.

E-VOTEX identifies the corresponding poll and loads the appropriate voting interface. The voter can then proceed through the authentication process before accessing the voting options.

---

## 6. Voter Authentication

Before voting, the voter can:

* Log in using an existing account
* Continue with Google
* Create a new account

This ensures that voting is performed by an authenticated user.

---

## 7. Voting Page

After authentication, the voter is taken to the **Voting Page**.

The page displays the poll information and the available options. The voter can review the poll and select the option they want to vote for.

---

## 8. Select an Option

The voter selects one of the available options.

The selected option is then prepared for confirmation rather than immediately completing the voting process. This gives the voter an opportunity to verify their choice.

---

## 9. Confirm or Edit Vote

Before the vote is permanently registered, the voter can review the selected option.

The voter can either:

**Confirm Vote**

or

**Edit Vote**

If the voter confirms the selection, the application records the vote.

---

## 10. Vote Registered

After successful submission, E-VOTEX displays a **Vote Registered** confirmation page.

This informs the voter that their vote has been successfully recorded.

The application also maintains the voting record so that the same authenticated user cannot repeatedly submit votes for the same poll.

---

# ⏱️ Poll End-Time Mechanism

## 11. Poll Automatically Ends at `end_time`

Every poll has a configured `end_time`.

Before the specified end time, eligible voters can access the voting process and submit their votes.

Once the current time reaches the poll's `end_time`, the voting period is considered closed.

Therefore, visiting the same poll link after the polling period has ended does not provide the normal voting interface.

Instead, the application moves the poll into its **results stage**.

---

# 📊 Results

## 12. Results on the Same Poll Link

One of the key features of E-VOTEX is that the **same poll link changes its purpose after the poll ends**.

### Before `end_time`

```text
Poll Link
    ↓
Authentication
    ↓
Voting Page
    ↓
Select Option
    ↓
Confirm Vote
    ↓
Vote Registered
```

### After `end_time`

```text
Same Poll Link
      ↓
Poll Ended
      ↓
Results Page
      ↓
Final Voting Results
```

This means the poll creator does not need to generate or distribute a separate results link. The original poll URL becomes the entry point for viewing the completed poll's results.

---

# 🔐 Voting Security

E-VOTEX incorporates authentication and database-backed voting logic to protect the voting workflow.

The application associates voting activity with authenticated users and the respective poll. The **one-vote-per-user-per-poll** mechanism is designed to prevent the same user from repeatedly submitting votes for a single poll.

The poll's `end_time` also prevents voting from continuing indefinitely. Once the configured voting period has expired, the poll moves from the voting stage to the results stage.

> **Note:** E-VOTEX is an educational Web Technology project and should not be considered a replacement for certified government or legally binding election infrastructure.

---

# 🛠️ Technologies Used

E-VOTEX was developed using modern web technologies, including:

| Technology       | Purpose                               |
| ---------------- | ------------------------------------- |
| **HTML**         | Web page structure                    |
| **CSS**          | Styling and layout                    |
| **JavaScript**   | Client-side functionality             |
| **Node.js**      | Server-side JavaScript runtime        |
| **Express.js**   | Web server and routing                |
| **EJS**          | Dynamic server-side web pages         |
| **Tailwind CSS** | User interface styling                |
| **PostgreSQL**   | Relational database                   |
| **Supabase**     | Database and authentication services  |
| **Google OAuth** | Google-based authentication           |
| **Git & GitHub** | Version control and source management |
| **Vercel**       | Web application deployment            |

---

# 📚 Learning Outcomes

Developing E-VOTEX provided practical experience in:

* Full-stack web application development
* Node.js and Express.js
* EJS templating
* Authentication and sessions
* Google OAuth
* PostgreSQL database management
* Supabase
* Database relationships and queries
* Form handling
* Dynamic routing
* Middleware
* Voting logic
* Access control
* Poll lifecycle management
* Deployment using Vercel
* Debugging production errors
* Git and GitHub workflow

The project also provided experience in connecting the **frontend, backend, authentication system, database and deployment environment** into one complete application.

---

# 🚀 Complete E-VOTEX Flow

```text
             ┌─────────────────────┐
             │      E-VOTEX        │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │ Login / Google /    │
             │   Create Account    │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │      Dashboard      │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │     Create Poll     │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │    Generate Link    │
             └──────────┬──────────┘
                        ↓
                Share Poll Link
                        ↓
             ┌─────────────────────┐
             │  Voter Authentication│
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │    Voting Page      │
             └──────────┬──────────┘
                        ↓
                 Select Option
                        ↓
             ┌─────────────────────┐
             │ Confirm / Edit Vote │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │   Vote Registered   │
             └──────────┬──────────┘
                        ↓
                  Poll End Time
                        ↓
             ┌─────────────────────┐
             │     Poll Closed     │
             └──────────┬──────────┘
                        ↓
             ┌─────────────────────┐
             │ Results on the Same │
             │     Poll Link       │
             └─────────────────────┘
```

---

# 👨‍💻 About the Developer

### Sai Avinash Nashikkar

E-VOTEX was developed by **Sai Avinash Nashikkar** as a practical project focused on applying Web Technology concepts to a real-world problem.

He is a S.Y student of the Diploma Institute Government Polytechnic, Pune pursuing the Diploma Degree of Computer Engineering.

📌 Project Status

**E-VOTEX — Developed and Deployed**

🌐 **Live:** https://e-votex-one.vercel.app/

---

## ⭐ Acknowledgement

E-VOTEX represents the practical application of concepts learned during Web Technology coursework and the development process provided valuable experience in building and deploying a complete web application from the ground up.

---

### Built with Passion by **Sai Avinash Nashikkar**
