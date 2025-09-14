require('dotenv').config();
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { createEvent } = require('ics');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET, // change this
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const users = [
    { id: 1, username: 'moraitis', email: process.env.MORAITIS_EMAIL , passwordHash: bcrypt.hashSync(process.env.MORAITIS_PASSWORD, 10) },
    { id: 2, username: 'ortensia', email: process.env.ORTENSIA_EMAIL ,passwordHash: bcrypt.hashSync(process.env.ORTENSIA_PASSWORD, 10) }
];

// Passport local strategy
passport.use(new LocalStrategy((username, password, done) => {
    const user = users.find(u => u.username === username);
    if (!user) return done(null, false, { message: 'Incorrect username.' });

    if (!bcrypt.compareSync(password, user.passwordHash)) {
        return done(null, false, { message: 'Incorrect password.' });
    }

    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});

// Show login form
app.get('/', (req, res) => {
    res.render('login');
});

// Handle login
app.post('/login', passport.authenticate('local', {
    successRedirect: '/form',
    failureRedirect: '/'
}));

// Logout
app.get('/logout', (req, res) => {
    req.logout(err => { if (err) console.log(err); res.redirect('/login'); });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

// Form page
app.get('/form', ensureAuthenticated, (req, res) => {
    res.render('index');
});

// Handle form submission
app.post('/send', ensureAuthenticated, (req, res) => {
    const { title, location, latitude, longitude, description, date, time } = req.body;

    // Parse using Moment
    const m = moment(date, 'YYYY-MM-DD HH:mm');

    if (!m.isValid()) {
        return res.send('Invalid date/time');
    }

    const year = m.year();
    const month = m.month() + 1; // Moment months are 0-indexed
    const day = m.date();
    const hour = m.hour();
    const minute = m.minute();

    // Google Maps link from lat/lng
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    const event = {
        start: [year, month, day, hour, minute],
        duration: { hours: 2 },
        title: title || 'Meeting',
        description: description,
        location: location,
        url: mapLink,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: {
            name: req.user.username,
            email: req.user.email
        }
    };

    createEvent(event, (error, value) => {
        if (error) {
            console.log(error);
            return res.send('Error creating event');
        }

        // Configure transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: `${process.env.MORAITIS_EMAIL}, ${process.env.ORTENSIA_EMAIL}`, // send to both
            subject: 'Meeting Invitation',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #d63384;">Let's Meet</h2>
                    <p style="font-size: 16px;">${description}</p>
                    
                    <p>
                        <strong>Location:</strong> ${location}<br>
                        <strong>Google Maps:</strong> 
                        <a href="${mapLink}" target="_blank" style="color: #1a73e8; text-decoration: none;">View on Map</a>
                    </p>
                    
                    <p>
                        <strong>Date & Time:</strong> ${date}
                    </p>

                </div>
            `,
            attachments: [
                {
                    filename: 'event.ics',
                    content: value,
                    contentType: 'text/calendar; charset="utf-8"; method=REQUEST'
                }
            ]
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                return res.send('Error sending email');
            }
            res.send('Meeting invitation sent successfully!');
        });
    });
});


// Catch-all route for any URL not matched above
app.get('*', (req, res) => {
    res.render('login')
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


