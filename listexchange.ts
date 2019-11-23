import * as XC from 'trc-httpshim/xclient'
import * as common from 'trc-httpshim/common'

import { strHash, sample, Encryptor } from './encrypthelper'

export type UploadHandle = string;
export type MatchId = string;
export type MatchPhase = string;
export type DownloadHandle = string;

export interface IUploadInfo {
    Title: string;
    N: number;
    Hashes: string[];
    EncryptedData: string[];
    Samples: String[];
    HashKind: string;
    EncryptKind: string;
    DataKind: string;
    EncryptCanary: string;
    Protocol : number;
}

export interface IUploadResult {
    Handle: UploadHandle;
}

export interface IBeginMatchResult {
    MatchId: MatchId;
}

export interface IMatchStatusResult_OverlapReport {
    YourListSize: number;
    OtherListSize: number;
    Overlap: number;
    OtherSamples : string[];
    OtherEncryptedCanary : string;
}

export interface IMatchStatusResult {
    Phase: MatchPhase;
    Report: IMatchStatusResult_OverlapReport; // Only set on Phase="Accepted"    
    YourResults: DownloadHandle; // Only set after Phase="AgreeSwap"
    
}

// TODO - make this an enum? But be sure it serializes. 
export class MatchPhases {
    public static Created: MatchPhase = "Created";
    public static Accepted: MatchPhase = "Accepted";
    public static AgreeSwap: MatchPhase = "AgreeSwap";

    static _ToInt : any = {
        Created : 0,
        Accepted : 1,
        AgreeSwap : 2
    }
    public static ToInt(x : MatchPhases) : number {
        return <number> (this._ToInt[<string> x]);
    }
}


export class LEClient {
    _http: XC.XClient;

    public constructor(authToken: string, urlApi: string) {
        this._http = XC.XClient.New(urlApi, authToken, null);
    }
    

    public static _Protocol : number = 1;
    public static _Canary : string = "test123"; // related to protocol

    public getUploadInfoFromFile(title : string, lines: string[], enc : Encryptor) : IUploadInfo
    {
        var body: IUploadInfo = {
            Title: title,
            N: lines.length,
            Samples : [],
            Hashes: [],
            EncryptedData: [],
            HashKind : Encryptor.HashKind,
            EncryptKind : Encryptor.EncryptKind,
            DataKind : "general",
            Protocol: LEClient._Protocol,
            EncryptCanary : enc.Encrypt(LEClient._Canary)
        };

        for(var i = 0; i < lines.length; i++)
        {
            var line = lines[i].trim();

            if (i < 5) {
                body.Samples.push(sample(line));
            }

            var hash = strHash(line);
            var encrypted = enc.Encrypt(line);

            body.Hashes.push(hash.toString());
            body.EncryptedData.push(encrypted);
        }

        return body;
    }

    // Returns the handle
    public uploadFileAsync(updateInfo : IUploadInfo): Promise<UploadHandle> {

        var body = updateInfo;
        
        return this._http.postAsync<IUploadResult>("/upload", body).then((response) => {
            // console.log("Upload successful: ");
            // console.log(response.Handle);

            return response.Handle;
        });

        // return Promise.resolve();
    }

    public createOrAcceptMatch(myHandle: UploadHandle, otherHandle: UploadHandle): Promise<MatchId> {
        var u = new XC.UrlBuilder("/match");
        u.addQuery("mine", myHandle);
        u.addQuery("other", otherHandle);

        return this._http.postAsync<IBeginMatchResult>(u, undefined).then((response) => {
            // console.log(" POST match successful: ");
            return response.MatchId;
        });
    }

    public verifyCanary(enc : Encryptor, results : IMatchStatusResult) : void 
    {
        var x = results.Report.OtherEncryptedCanary;
        var y = enc.Decrypt(x);
        if (y != LEClient._Canary)
        {
            // This should never happen with a well-behaved client.
            throw "Error: encryption canary failed.";
        }
    }

    // $$$ >= phase. (they're strings...)
    public waitForStatus(matchId: MatchId, phase: MatchPhase): Promise<IMatchStatusResult> {
        var u = new XC.UrlBuilder("/match/" + matchId);
        // u.addQuery("id", matchId);

        return new Promise<IMatchStatusResult>((resolve, reject) => {
            var worker = () => {
                this._http.getAsync<IMatchStatusResult>(u).then((response) => {
                    console.log(".");
                    if (MatchPhases.ToInt(response.Phase) >= MatchPhases.ToInt(phase)) {
                        //console.log("Now in phase: " + phase);
                        resolve(response);
                        return;
                    }
                    setTimeout(() => {
                        worker();
                    }, 5*1000);
                }).catch(() => {
                    reject();
                });
            };
            worker(); // Initial call

        });
    }

    public SwapN(matchId: MatchId, swapN: number): Promise<void> {
        var u = new XC.UrlBuilder("/match/" + matchId + "/setn");
        // u.addQuery("id", matchId);
        u.addQuery("N", swapN);

        return this._http.postAsync<IMatchStatusResult>(u, undefined).then((response) => {
            // console.log("swap " + swapN + ". waiting for confirmation.");
        });
    }

    public Download(handle: DownloadHandle): Promise<string[]> {
        var u = new XC.UrlBuilder("/Download");
        u.addQuery("handle", handle);

        return this._http.postAsync<string[]>(u, undefined).then((response) => {
            return response;
        });
    }
}
