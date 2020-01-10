#! /usr/bin/env node

// See details for making a command line tool 
// http://blog.npmjs.org/post/118810260230/building-a-simple-command-line-tool-with-npm 

import * as XC from 'trc-httpshim/xclient'
import * as common from 'trc-httpshim/common'

import * as login from './login'
import * as le from './listexchange'

declare var process: any;  // https://nodejs.org/docs/latest/api/process.html
// declare var require: any;

import * as readline from 'readline';
import * as fs from 'fs';
import { Encryptor, strHash } from './encrypthelper';

// https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs
// require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Explicit typing for expected args
interface IArgsLogin {
    user: string;
    pwd: string;
    url: string;
}
interface IArgsFlow {
    id: le.MatchId;
    phrase: string; // needed if we specify file     
    file: string;
    h: le.Receipt; // encapsulates (phrase,file)
    h2: le.Receipt;
    n: number;
}
interface IArgs extends IArgsLogin, IArgsFlow {

}

// argv will be strongly typed from option() usage. 
import * as yargs from 'yargs'
var argv: IArgs = yargs
    .option("phrase", {
        description: "your passphrase for encryption.",
        string: true
    })
    .option('user', {
        required: true,
        description: "userid for login",
        string: true
    })
    .option('pwd', {
        required: true,
        description: "password for login",
        string: true
    })
    .option('url', {
        required: true,
        description: "API server",
        //default: "https://localhost:44387",
        default: "https://listexchangeapi.azurewebsites.net",
        string: true,
    })
    .option('id', {
        description: "'id of match. Used after match is accepted",
        string: true
    }).option("file", {
        description: 'path to local file to upload. This will give a handle to use with --h',
        string: true
    })
    .option('h', {
        description: 'my upload handle.',
        string: true
    })
    .option('h2', {
        description: 'handle of file to swap with. Used to initiate a match',
        string: true
    })
    .option('n', {
        description: 'number of items to swap',
        number: true
    })
    .argv;



function printReport(result: le.IMatchStatusResult) {
    var r = result.Report;
    console.log("  Your list size : " + r.YourListSize + " (" + (r.YourListSize - r.Overlap) + " unique)");
    console.log("  Their list size: " + r.OtherListSize + " (" + (r.OtherListSize - r.Overlap) + " unique)");
    console.log("          Overlap: " + r.Overlap);

    if (r.OtherSamples) {
        console.log("anonymized samples from their list:");
        for (var i in r.OtherSamples) {
            console.log("  " + r.OtherSamples[i]);
        }
    }
}


function readFileLines(path: string): string[] {
    var buffer = fs.readFileSync(path);
    var x = buffer.toString();
    var lines = x.split('\n');

    return lines;
}

// Helper for reading 
// https://stackoverflow.com/questions/8128578/reading-value-from-console-interactively
function readlineAsync(prompt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function inputPassPhrase(): Promise<string> {
    while (true) {
        var phrase = await readlineAsync("Enter a short passphrase for encrypting ([a-z]):");
        phrase = phrase.toLowerCase();
        if (le.Helpers.isValidPassPhrase(phrase)) {
            return phrase;
        }
        console.log(' bad passphrase. Try again.');
    }
}

async function inputReceiptAsync(): Promise<string> {
    while (true) {
        var receipt = await readlineAsync("Enter partner's receipt:");
        if (le.Helpers.isValidReceipt(receipt)) {
            return receipt;
        }
        console.log("  receipt is not valid. Try again.");
    }
}

// The primnary workflow for a list exchange. 
// Filling in various opts lets us skip ahead. 
async function workflow(client: le.LEClient, opts: IArgsFlow) {

    // $$$ SAve Opts to file at each stage; can then just resume via '--resume foo.txt'
    if (!opts.id) {
        if (!opts.h) {
            var phrase = await inputPassPhrase();

            var encryptor = new Encryptor(phrase);

            var file = opts.file;
            if (!file) {
                file = await readlineAsync("Enter full path for CSV file to upload:");
                opts.file = file;
            }
            var lines = readFileLines(file);
            var title = file;
            var parseResult = client.getUploadInfoFromFile(title, lines, encryptor);

            var uploadInfo = parseResult.body;
            var handle = await client.uploadFileAsync(uploadInfo);

            opts.h = le.Helpers.MakeReceipt(handle, phrase);

            console.log("encrypted and uploaded " + file + "...");

            {
                var yourSamples: string[] = parseResult.sampleKeys;
                console.log("sample keys from your file:")
                for (var i = 0; i < yourSamples.length; i++) {
                    console.log("  " + yourSamples[i]);
                }
            }

            console.log();
            console.log("  to resume from here: --h " + opts.h);
        } else {
            console.log("Using previous upload...");
        }

        console.log();
        console.log("Your receipt (give this to a partner to swap): ");
        console.log("   " + opts.h);
        console.log();

        if (!opts.h2) {
            opts.h2 = await inputReceiptAsync();
        }

        // Now initiate a match 
        var h1 = le.Helpers.getUploadHandle(opts.h);
        var h2 = le.Helpers.getUploadHandle(opts.h2);
        opts.id = await client.createOrAcceptMatch(h1, h2);
        console.log("Match Created: " + opts.id);
    } else {
        // Must also have receipt specified since that's where the decoding passcode is.
        if (!opts.h2) {
            console.log("Missing --h2 parameter. Required when using --id.");
            return;
        } else {
            // TODO - consistency cheeck between id and h2. 
        }

        console.log("Using previously created match: " + opts.id);
    }


    // Both sides must accept the match to continue;
    console.log();
    console.log("[Waiting for partner to enter your receipt to accept the match...]");
    console.log("> to resume from here: --id " + opts.id + "--h2 " + opts.h2);

    var response1 = await client.waitForStatus(opts.id, le.MatchPhases.Accepted);
    console.log("Match Accepted!");
    printReport(response1);

    // Verify encryption canary 
    var decryptor = new Encryptor(le.Helpers.getPhrase(opts.h2));
    client.verifyCanary(decryptor, response1);


    if (!opts.n) {
        // $$$ Readline for # to swap
        var nstr = await readlineAsync("How many new entries N to swap?");
        opts.n = parseInt(nstr);
    }
    await client.SwapN(opts.id, opts.n); // Safe to call again. 

    console.log();
    console.log("[Waiting for partner to enter N and agree to the exchange.]");
    console.log("> to resume from here: --id " + opts.id + " --n " + opts.n);
    var response2 = await client.waitForStatus(opts.id, le.MatchPhases.AgreeSwap);

    console.log();
    console.log("Swap succesful. Download results: " + response2.YourResults);

    var encryptedLines = await client.Download(response2.YourResults);

    // Decrypt results using the phrase from the other's handle. 

    for (var i = 0; i < encryptedLines.length; i++) {
        console.log("  " + decryptor.Decrypt(encryptedLines[i]));
    }
}

async function mainAsync(): Promise<void> {
    console.log("List Exchange CLI");


    var user = argv.user;
    var pswd = argv.pwd;
    var jwt = await login.loginWithPasswordAsync(user, pswd);
    console.log("Login success...");

    var client = new le.LEClient(jwt, argv.url);
    /*
        var lines = readFileLines(argv.file);
        var uploadInfo = client.getUploadInfoFromFile(argv.file, lines);
    
    console.log(JSON.stringify(uploadInfo));
    return;*/

    //return;    
    // Both users must upload their files. 
    //console.log(JSON.stringify(opts));
    //return;



    try {
        await workflow(client, argv);
    }
    catch (err) {
        console.log("There was an error: " + JSON.stringify(err));
    }
}


mainAsync().then(() => {
    console.log("Done");
});


function encryptTest() {
    console.log(strHash("abcdef"));

    var enc = new Encryptor("secret123");
    var x = enc.Encrypt("Hello World1!");
    console.log(x);
    console.log(enc.Decrypt(x));
}