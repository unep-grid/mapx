const sql = require('sql');
var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
var request = require('supertest');
const app = require.main.require('./index');
const pgRead = require.main.require('./db').pgRead;
const pgWrite = require.main.require('./db').pgWrite;
const user = require('../db/models').user;
const project = require('../db/models').project;
const getProjects = require('../utils/getProjects');
const testStartId = 1000000;

describe('Get projects', function() {
  before(function(done) {
    var sqls = [];

    // Add some mx_users
    [
      {id: testStartId + 1, username: `bob`},
      {id: testStartId + 2, username: `marcus`}
    ].forEach(function(item) {
      sqls.push(user.insert(Object.assign({}, user.default, {
        pid: item.id,
        id: item.id,
        username: item.username,
        email: `${item.username}@test.localhost`,
        key: item.id,
      })).toQuery());
    });

    // Add some mx_projects
    [
      project.insert(Object.assign({}, project.default, {
        pid: testStartId + 1,
        id: 'AA-AAA-AAA-AAA-AAA-AAA',
        id_old: 'AAA',
        title: '{"en": "AAA (en)", "fr": "AAA (fr)"}',
        members: `[${testStartId + 1}]`
      })).toQuery(),
      project.insert(Object.assign({}, project.default, {
        pid: testStartId + 2,
        id: 'BB-BBB-BBB-BBB-BBB-BBB',
        id_old: 'BBB',
        title: '{"en": "BBB (en)", "fr": "BBB (fr)"}',
        members: `[${testStartId + 1}]`,
        publishers: `[${testStartId + 1},${testStartId + 2}]`,
      })).toQuery(),
      project.insert(Object.assign({}, project.default, {
        pid: testStartId + 3,
        id: 'CC-CCC-CCC-CCC-CCC-CCC',
        id_old: 'CCC',
        title: '{"en": "CCC (en)", "fr": "CCC (fr)"}',
        admins: `[${testStartId + 2}]`,
      })).toQuery(),
    ].forEach(function(item) {
      sqls.push(item);
    });

    Promise.all(
      sqls.map(sql => pgWrite.query(sql))
    ).then(function(results) {
      done();
    });
  });
  after(function(done) {
    var sqls = [
      `DELETE FROM public.mx_projects WHERE pid >= ${testStartId}`,
      `DELETE FROM public.mx_users WHERE pid >= ${testStartId}`,
    ];
    Promise.all(
      sqls.map(sql => pgWrite.query(sql))
    ).then(function(results) {
      done();
    });
  });

  it('/Get empty', function(done) {
    request(app).get(`/get/projects/list/user/0`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.be.empty;
        done();
      });
  });

  it(`/Get by user id (${testStartId + 1})`, function(done) {
    request(app).get(`/get/projects/list/user/${testStartId + 1}`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(2);
        done();
      });
  });

  it(`/Get by user id (${testStartId + 2})`, function(done) {
    request(app).get(`/get/projects/list/user/${testStartId + 2}`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(2);
        done();
      });
  });

  it(`/Get by user id (${testStartId + 1}) with member role`, function(done) {
    request(app).get(`/get/projects/list/user/${testStartId + 1}?role=member`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(2);
        done();
      });
  });

  it(`/Get by user id (${testStartId + 1}) with publisher role`, function(done) {
    request(app).get(`/get/projects/list/user/${testStartId + 1}?role=publisher`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(1);
        done();
      });
  });

  it(`/Get by user id (${testStartId + 2}) with admin role`, function(done) {
    request(app).get(`/get/projects/list/user/${testStartId + 2}?role=admin`)
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(1);
        done();
      });
  });
});
