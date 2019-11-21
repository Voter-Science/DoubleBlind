

export class Helpers
{
    // https://www.regexpal.com/
    public static PassphraseRegEx : RegExp = /^[a-z0-9]{3,10}$/g;

    public static isValidPassPhrase(phrase :string) : boolean {
        return Helpers.PassphraseRegEx.test(phrase);
    }

    public static ReceiptRegEx : RegExp = /^[a-z0-9]{3,10}\-[a-z0-9]{3,10}$/g;
    public static isValidReceipt(receipt :string) : boolean {
        return Helpers.ReceiptRegEx.test(receipt);
    }
}


export function sample(str : string) : string {
    var x = "";
    for (var i = 0; i < str.length; i++) {
      var ch   = str.charAt(i);
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

// $$$ Need real hash 
export function strHash(str : string) : number {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  // $$$ TODO - need real encyrption. 
export class Encryptor
{
    private readonly _key : string;
    public constructor(key : string)
    {
        this._key = "ENC_" + key + "_";
    }

 public Encrypt(input : string) : string { 
    return this._key + input;
 }
 public Decrypt(input : string) : string { 
     if (input.indexOf(this._key) != 0)
     {
         throw "Decrypt failure";
     }
    return input.substring(this._key.length, input.length);     
}
}