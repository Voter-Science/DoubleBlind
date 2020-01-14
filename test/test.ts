
import * as chai from 'chai';
var assert = chai.assert;

import * as e2 from '../dist/encrypthelper'
import * as le from '../dist/listexchange'

console.log("Hi");

// Trivial case, should always pass.
// If this fails, then something's wrong in the environment. 
describe('sanity', function () {
    it('test1', ()=> {
        assert.equal(5, 3+2);
    });
});

describe('hash', function () {
    it('case-insensitive', ()=> {
        assert.equal(
            e2.strHash("abc"),
            e2.strHash("ABC"));
    });
});

describe('sample', function () {
    var f = (str : string, expected : string) => 
        assert.equal(le.Helpers.sample(str), expected);

    it('sample1', ()=> {
        f("aBc.com", "xxx.xxx");
        f("a12@!", "x##@!");            
    });
});

describe('encrypt', function () {    
    var key = "abc";
    var e = new e2.Encryptor(key);
    var plain1 = "abc123";
    var cipher = e.Encrypt(plain1);
    var plain2 = e.Decrypt(cipher);

    it('roundtrip', ()=> {
        assert.equal(plain1, plain2);            
    });

    // Each encryption has its own salt value.
    // So encrypting the same value multiple times gives different results. 
    // https://stackoverflow.com/questions/24455810/crypto-js-returns-different-values-every-time-its-run-when-using-aes
    it('consistent', ()=> {
        var cipher2 = e.Encrypt(plain1);
        assert.notEqual(cipher, cipher2);            
    });
});

describe('getUploadInfoFromFileWorker', function () {
    // var client = new le.LEClient("token", "http://contoso");
    var key = "abc";
    var enc = new e2.Encryptor(key);

    // Single column
    var lines = ["a1.com","b", "c", "d", "e", "f"];
    var len = lines.length;

    var result = le.LEClient.getUploadInfoFromFileWorker("title1", lines, enc);
    var body = result.body;

    it('upload1', ()=> {
        assert.equal(result.sampleKeys.length, 5); // Only takes top 5 samples. 
        assert.equal(result.sampleKeys[0], lines[0]); // 

        assert.equal(body.Samples[0], "x#.xxx"); // anonymized.

        assert.equal(body.Hashes.length, len);
        assert.equal(body.EncryptedData.length, len);

        assert.equal(enc.Decrypt(body.EncryptCanary), le.LEClient._Canary);

        assert.equal(body.N, len);
    });

    // Test protocol constants in the body. 
    it ("constants", ()=> {
        assert.equal(body.DataKind, "general");
        assert.equal(body.Protocol, 1);
        assert.equal(body.HashKind, "SHA256");
        assert.equal(body.EncryptKind, "AES:a");        
    });
});

describe('getUploadInfoFromFileWorker2', function () {
    // var client = new le.LEClient("token", "http://contoso");
    var key = "abc";
    var enc = new e2.Encryptor(key);

    // Multiple columns.
    // - first row is header
    // - Col0 is the keys, rest is date. 
    var lines = [
        "key,value",
        "a,v1", 
        "b,v2"];
    var len = lines.length - 1; // 1st row is header

    var result = le.LEClient.getUploadInfoFromFileWorker("title2", lines, enc);
    var body = result.body;

    it('upload1', ()=> {
        assert.equal(result.sampleKeys.length, 2); 
        assert.equal(result.sampleKeys[0], "a");

        assert.equal(body.Samples[0], "x"); // anonymized.

        assert.equal(body.Hashes.length, len);
        assert.equal(body.EncryptedData.length, len);

        assert.equal(body.N, len);
    });
});


