
// TODO - use strong typing with @types/crypto-js
var aes = require("crypto-js/aes");
var encHex = require("crypto-js/enc-hex");
var encUtf8 = require("crypto-js/enc-utf8");
var SHA256 = require("crypto-js/sha256");


export class Helpers {
    // https://www.regexpal.com/
    public static PassphraseRegEx: RegExp = /^[a-z0-9]{3,10}$/g;

    public static isValidPassPhrase(phrase: string): boolean {
        return Helpers.PassphraseRegEx.test(phrase);
    }

    public static ReceiptRegEx: RegExp = /^[a-z0-9]{3,10}\-[a-z0-9]{3,10}$/g;
    public static isValidReceipt(receipt: string): boolean {
        return Helpers.ReceiptRegEx.test(receipt);
    }
}


// Given data, pseudo-anonymize it to show the shape as a sample. 
// This is not a hash, not encyrption. 
export function sample(str: string): string {
    var x = "";
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (ch >= 'a' && ch <= 'z') {
            x += 'x';
        } else if (ch >= 'A' && ch <= 'Z') {
            x += 'x';
        } else if (ch >= '0' && ch <= '9') {
            x += '#'
        } else {
            x += ch;
        }
    }
    return x;
};

// Case insensitive hash. 
export function strHash(str: string): number {    
    str = str.toLowerCase();
    var hash = SHA256(str);
    return hash.toString(encHex);
}

export class Encryptor {
    private readonly _key: string;
    public constructor(key: string) {
        this._key = key;
    }

    private static _prefix: string = "prefix:";

    public static readonly HashKind : string = "SHA256";
    public static readonly EncryptKind : string = "AES:a";

    public Encrypt(input: string): string {
        var x = Encryptor._prefix + input;

        var ciphertext = aes.encrypt(x, this._key).toString();
        return ciphertext;
    }

    public Decrypt(input: string): string {
        var bytes  = aes.decrypt(input, this._key);

        var originalText = bytes.toString(encUtf8); // will return 0-length if encryption fails. 

        // Checksum
        if (originalText.indexOf(Encryptor._prefix) != 0) {
            throw "Bad decryption";
        }
        var len = Encryptor._prefix.length;
        return originalText.substr(len, originalText.length - len);
    }
}