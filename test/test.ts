
import * as chai from 'chai';
var assert = chai.assert;

import * as e2 from '../dist/encrypthelper'

console.log("Hi");

// Should always pass
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

describe('encrypt', function () {    
    var key = "abc";
    var e = new e2.Encryptor(key);
    var plain1 = "abc123";
    var cipher = e.Encrypt(plain1);
    var plain2 = e.Decrypt(cipher);

    it('roundtrip', ()=> {
        assert.equal(plain1, plain2);            
    });
});



