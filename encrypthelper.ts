
// TODO - use strong typing with @types/crypto-js
var aes = require("crypto-js/aes");
var encHex = require("crypto-js/enc-hex");
var encUtf8 = require("crypto-js/enc-utf8");
var SHA256 = require("crypto-js/sha256");

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