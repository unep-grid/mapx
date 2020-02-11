var chai = require('chai');
var expect = chai.expect;
var request = require('supertest');
const app = require.main.require('./index');
const encrypt = require.main.require('./utils/db').encrypt;
const auth = require.main.require('./utils/authentication');

describe('Miscellaneous', function() {
  it('/GET /get/ip', function(done) {
    request(app).get(`/get/ip`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body.ip).to.be.not.empty;
        done();
      });
  });

  describe('User authentication', function() {
    var guestUser = {
      userId: 2,
      userToken: {
        "token": "g8ejy73lqe7e8m6",
        "is_guest": true,
        "valid_until": new Date().getTime() / 1000 + 2 * 86400,
      }
    };
    var adminUser = {
      userId: 1,
      userToken: {
        "token": "3oqf43x3mbr1j78",
        "is_guest": false,
        "valid_until": new Date().getTime() / 1000 + 2 * 86400,
      }
    };

    it('User guest token validation', function(done) {
      encrypt(JSON.stringify(guestUser.userToken)).then(function(userTokenEncrypted) {
        auth.validateToken(userTokenEncrypted).then(function(tokenValidation) {
          expect(tokenValidation.isValid).to.be.true;
          done();
        });
      });
    });

    it('User admin token validation', function(done) {
      encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {
        auth.validateToken(userTokenEncrypted).then(function(tokenValidation) {
          expect(tokenValidation.isValid).to.be.true;
          done();
        });
      });
    });

    it('User guest validation', function(done) {
      encrypt(JSON.stringify(guestUser.userToken)).then(function(userTokenEncrypted) {
        auth.validateToken(userTokenEncrypted).then(function(tokenValidation) {
          expect(tokenValidation.isValid).to.be.true;
          return auth.validateUser(guestUser.userId, tokenValidation.key);
        }).then(function(userValidation) {
          expect(userValidation.email).to.equal('guest@mapx.org');
          done();
        });
      });
    });

    it('User admin validation', function(done) {
      encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {
        auth.validateToken(userTokenEncrypted).then(function(tokenValidation) {
          expect(tokenValidation.isValid).to.be.true;
          return auth.validateUser(adminUser.userId, tokenValidation.key);
        }).then(function(userValidation) {
          expect(userValidation.email).to.equal('admin@localhost');
          done();
        });
      });
    });
  });
});
