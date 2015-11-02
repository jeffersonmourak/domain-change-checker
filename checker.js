var exec = require('child_process').exec;
var nodemailer = require('nodemailer');
var Sync = require('sync');
var read = require("./read.js");
var fs = require('fs');

var credentials = {
    email: false,
    password: false
}

if (fs.existsSync("./credentials.json")) {
    credentials = require("./credentials.json");
}

Sync(function() {
    Arguments = require("./arguments.js");
    acceptableArguments = require("./arguments.json");

    var ready = true;

    var args = process.argv;
    var argumentQuery = Arguments(args, acceptableArguments);

    if (!argumentQuery.domain) {
        console.log("You need insert the domain that will be tracked, use node checker.js -d <yourdomain>\n");
        ready = false;
    }
    if ((!credentials.email && !credentials.password) && (argumentQuery.email === undefined || argumentQuery.password === undefined)) {
        console.log("You need insert yours GMAIL credentials.\nplease create the credentials.json file or run node checker.js -e <yourEmail@gmail.com> -p password\n");
        ready = false;
    } else if ((!credentials.email && !credentials.password)) {
        credentials.email = argumentQuery.email;
        credentials.password = read({
            prompt: 'Password: ',
            silent: true
        });
    }

    if (ready) {
        var interval = argumentQuery.interval;
        if (!interval) {
            interval = 3600;
        }

        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: credentials.email,
                pass: credentials.password
            }
        });

        var mailOptions = {
            from: credentials.email + ' <' + credentials.email + '>', // sender address
            to: credentials.email, // list of receivers
            subject: '', // Subject line
            text: '', // plaintext body
            html: '' // html body
        };

        var lastData = {};
        var _lastData = {};
        var filter = "";

        function updateServerInfo() {
            var child = exec("dig " + argumentQuery.domain + " +nostats +nocomments +nocmd");
            child.stdout.on('data', function(data) {
                var lines = data.split("\n");
                var changed = false;
                for (var i = 3; i < lines.length; i++) {
                    var line = lines[i];
                    var data = line.split("\t");
                    if (data.length > 1) {

                        var domainData = {};
                        domainData.domain = data[0].replace(";", "");
                        domainData.port = data[1] || "NULL";
                        domainData.server = data[4] || "NULL";
                        if (domainData.server !== "NULL") {
                            lastData = domainData;
                            if (_lastData.server === undefined) {
                                _lastData = lastData;
                            }
                            changed = true;
                        }
                    }
                }
                if (!changed) {
                    lastData = {
                        domain: null,
                        port: null,
                        server: null
                    };
                }
            });
        }
        var log = "";
        var _i = 0;
        var interval = setInterval(function() {
            if(_i > 7){
                lastData.server = "127.0.0.1";
                lastData.domain = "google.com";
            } 
            _i++;
            var date = new Date();
            var timeData = (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + "/" + date.getMonth() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

            log += "Checking server Status:\nNow Is: " + timeData;
            console.log("Checking server Status:\nNow Is: " + timeData);

            if (lastData.server !== undefined && lastData.server !== null) {
                if ((lastData.server !== _lastData.server) || (lastData.domain !== _lastData.domain)) {

                    var changes = "";
                    var changesHTML= "";

                    if(lastData.server !== _lastData.server){
                        changes += "CHANGED THE SERVER\n";
                        changes += "OLD VALUE:\n" + _lastData.server + "\nNEW VALUE:\n" + lastData.server;
                        changesHTML += "<h3>CHANGED THE SERVER</h3>";
                        changesHTML += "<b>OLD VALUE:</b><p style='color:red;'>" + _lastData.server + "</p><br><b>NEW VALUE:</b><p style='color:green;'>" + lastData.server + "</p>";
                    }

                    if(lastData.domain !== _lastData.domain){
                        changes += "CHANGED THE DOMAIN\n";
                        changes += "OLD VALUE:\n\t" + _lastData.domain + "\nNEW VALUE:\n\t" + lastData.domain;
                        changesHTML += "<h3>CHANGED THE DOMAIN</h3>";
                        changesHTML += "<b>OLD VALUE:</b><p style='color:red;'>" + _lastData.domain + "</p><br><b>NEW VALUE:</b><p style='color:green;'>" + lastData.domain + "</p>";
                    }

                    log += "\nServer Status Changed, and match the filter";
                    console.log("\nServer Status Changed, and match the filter");
                    mailOptions.subject = "NODE VERIFIER, DONE!";
                    mailOptions.text = "The code has returned \"DONE!\"\n" + changes + "\n\nLOG:\n" + log;
                    mailOptions.html = "The code has returned <b>\"DONE!\"</b><br>"+ changesHTML +"<br><br><h3>LOG</h3><pre>" + log + "</pre>";

                    transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: ' + info.response);

                    });

                    clearInterval(interval);
                }
                else {
                    log += "\nNo Changes\n=====================================\n\n";
                    console.log("No Changes\n=====================================\n\n");
                }
            } else if (lastData.server === null) {
                log += "\nServer Status Changed, and match the filter, but match with an error";

                console.log("\nServer Status Changed, and match the filter, but match with an error");
                mailOptions.subject = "NODE VERIFIER, ERROR!";
                mailOptions.text = "The code has returned \"ERROR!\"\n\nLOG:\n" + log;
                mailOptions.html = "The code has returned <b>\"ERROR!\"</b><br><br><h3>LOG</h3><pre>" + log + "</pre>";

                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message sent: ' + info.response);

                });
                clearInterval(interval);
            } else {
                log += "\nNo Changes\n=====================================\n\n";
                console.log("No Changes\n=====================================\n\n");
            }
            updateServerInfo();
        }, (interval * 1000));

    }

});
