// Licensed under the Apache License. See footer for details.
var express = require('express');
var passport = require('passport');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser());

var cookieParser = require('cookie-parser');
app.use(cookieParser());

var expressSession = require('express-session');
var sessionStore  = new expressSession.MemoryStore;
app.use(expressSession({ secret: 'somesecretmagicword', store: sessionStore}))

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var port = (process.env.VCAP_APP_PORT || 8192);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var url = JSON.parse(process.env.VCAP_APPLICATION || '{"uris":["' + 'https://' + host + ':' + port + '"]}').uris[0] 

var SSO_CLIENT_ID = (process.env.SSO_CLIENT_ID || ' ');
var SSO_CLIENT_SECRET = (process.env.SSO_CLIENT_SECRET || ' ');

var IbmIdStrategy = require('passport-ibmid-oauth2').Strategy;
passport.use('ibmid', new IbmIdStrategy({
    clientID: SSO_CLIENT_ID,
    clientSecret: SSO_CLIENT_SECRET,
    callbackURL: 'https://' + url + '/auth/ibmid/callback',
    passReqToCallback: true    
  }, function(req, accessToken, refreshToken, profile, done) {
    req.session.ibmid = {};
    req.session.ibmid.profile = profile;
    return done(null, profile);
  }
));

app.get('/auth/ibmid', passport.authenticate('ibmid', { scope: ['profile'] }), function(req, res) {
});

app.get('/auth/ibmid/callback', passport.authenticate('ibmid', { failureRedirect: '/error', scope: ['profile'] }), function(req, res) {
  res.redirect('/private')
});        

function authenticate() {
  return function(req, res, next) {
    if (!req.isAuthenticated() || req.session.ibmid == undefined)
      res.redirect('/auth/ibmid');
    else
      next();
  }
}

app.get('/', function(req, res) {
  res.send('Hello World! <a href="/private">Login</a>\n');
});

app.get('/private', authenticate(), function(req, res) {
  var profile = req.session.ibmid.profile;
  res.send('Hello ' + profile.firstName + ' ' + profile.lastName + '! <a href="/logout">Logout</a>\n');
});

app.get('/error', function(req, res) {
  res.send('Failed to authenticate\n');
});

app.get('/logout', function(req, res) {
  passport._strategy('ibmid').logout(req, res, 'https://' + url + '/');
});

app.listen(port, host);
//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2014
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
