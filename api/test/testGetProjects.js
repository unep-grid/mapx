/**
* TODO: Rewrite using using ESM 
*/  

/*import {Sql} from 'sql-ts';*/
/*//import assert from 'assert';*/
/*var chai = require('chai');*/
/*var expect = chai.expect;*/
/*var request = require('supertest');*/
/*const app = require.main.require('./index');*/
/*const pgRead = require.main.require('./db').pgRead;*/
/*const pgWrite = require.main.require('./db').pgWrite;*/
/*const user = require('../db/models').user;*/
/*const project = require('../db/models').project;*/
/*const getProjects = require('../utils/getProjects');*/
/*const testStartId = 1000000;*/
/*const encrypt = require.main.require('./utils/db').encrypt;*/

/*const sql = new Sql('postgres');*/


/*describe('Get projects', function() {*/

  /*var adminUser = {*/
    /*userId: 1,*/
    /*userToken: {*/
      /*"token": "3oqf43x3mbr1j78",*/
      /*"is_guest": false,*/
      /*"valid_until": new Date().getTime() / 1000 + 2 * 86400,*/
    /*}*/
  /*};*/

  /*before(function(done) {*/
    /*var sqls = [];*/

    /*// Add some mx_users*/
    /*[*/
      /*{id: testStartId + 1, username: `bob`},*/
      /*{id: testStartId + 2, username: `marcus`}*/
    /*].forEach(function(item) {*/
      /*sqls.push(user.insert(Object.assign({}, user.default, {*/
        /*pid: item.id,*/
        /*id: item.id,*/
        /*username: item.username,*/
        /*email: `${item.username}@test.localhost`,*/
        /*key: item.id,*/
      /*})).toQuery());*/
    /*});*/

    /*// Add some mx_projects*/
    /*[*/
      /*project.insert(Object.assign({}, project.default, {*/
        /*pid: testStartId + 1,*/
        /*id: 'AA-AAA-AAA-AAA-AAA-AAA',*/
        /*id_old: 'AAA',*/
        /*title: '{"en": "AAA (en) risk treatment", "fr": "AAA (fr)"}',*/
        /*members: `[${testStartId + 1}]`*/
      /*})).toQuery(),*/
      /*project.insert(Object.assign({}, project.default, {*/
        /*pid: testStartId + 2,*/
        /*id: 'BB-BBB-BBB-BBB-BBB-BBB',*/
        /*id_old: 'BBB',*/
        /*title: '{"en": "BBB (en)", "fr": "BBB risk (fr)"}',*/
        /*members: `[${testStartId + 1}]`,*/
        /*publishers: `[${testStartId + 1},${testStartId + 2}]`,*/
      /*})).toQuery(),*/
      /*project.insert(Object.assign({}, project.default, {*/
        /*pid: testStartId + 3,*/
        /*id: 'CC-CCC-CCC-CCC-CCC-CCC',*/
        /*id_old: 'CCC',*/
        /*title: '{"en": "CCC (en)", "fr": "threats CCC (fr)"}',*/
        /*admins: `[${testStartId + 2}]`,*/
      /*})).toQuery(),*/
    /*].forEach(function(item) {*/
      /*sqls.push(item);*/
    /*});*/

    /*Promise.all(*/
      /*sqls.map(sql => pgWrite.query(sql))*/
    /*).then(function(results) {*/
      /*done();*/
    /*});*/
  /*});*/
  /*after(function(done) {*/
    /*var sqls = [*/
      /*`DELETE FROM public.mx_projects WHERE pid >= ${testStartId}`,*/
      /*`DELETE FROM public.mx_users WHERE pid >= ${testStartId}`,*/
    /*];*/
    /*Promise.all(*/
      /*sqls.map(sql => pgWrite.query(sql))*/
    /*).then(function(results) {*/
      /*done();*/
    /*});*/
  /*});*/

  /*it('User test insertions', function(done) {*/
    /*var sql = user.select(user.pid.count()).where(user.pid.gt(testStartId)).toQuery();*/
    /*pgRead.query(sql).then(function(result) {*/
      /*expect(result.rows[0].pid_count).to.equal(2);*/
      /*done();*/
    /*});*/
  /*});*/

  /*it('Project test insertions', function(done) {*/
    /*var sql = project.select(project.pid.count()).where(project.pid.gt(testStartId)).toQuery();*/
    /*pgRead.query(sql).then(function(result) {*/
      /*expect(result.rows[0].pid_count).to.equal(3);*/
      /*done();*/
    /*});*/
  /*});*/

  /*it('GET /get/projects/list/user/0 empty', function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/0`)*/
        /*.query({*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.be.empty;*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/${testStartId + 1} as member`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/${testStartId + 1}`)*/
        /*.query({*/
          /*role: 'member',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(2);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/${testStartId + 2} as publisher`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/${testStartId + 2}`)*/
        /*.query({*/
          /*role: 'publisher',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(2);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/${testStartId + 2} as admin`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/${testStartId + 2}`)*/
        /*.query({*/
          /*role: 'admin',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(1);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/${testStartId + 1} as admin`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/${testStartId + 1}`)*/
        /*.query({*/
          /*role: 'admin',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(0);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/1} specifying title search exact match`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/1`)*/
        /*.query({*/
          /*role: 'any',*/
          /*title: 'CCC (en)',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(1);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/1} specifying title search prefix match`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/1`)*/
        /*.query({*/
          /*role: 'any',*/
          /*language: 'fr',*/
          /*titlePrefix: 'BBB',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(1);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/1} specifying title search prefix no match`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/1`)*/
        /*.query({*/
          /*role: 'any',*/
          /*titlePrefix: 'ZZZ (en)',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(0);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/

  /*it(`GET /get/projects/list/user/1} specifying title search fuzzy match`, function(done) {*/
    /*encrypt(JSON.stringify(adminUser.userToken)).then(function(userTokenEncrypted) {*/
      /*request(app).get(`/get/projects/list/user/1`)*/
        /*.query({*/
          /*role: 'any',*/
          /*titleFuzzy: 'threat',*/
          /*language: 'fr',*/
          /*idUser: adminUser.userId,*/
          /*token: userTokenEncrypted,*/
        /*})*/
        /*.end(function(err, res) {*/
          /*expect(res.statusCode).to.equal(200);*/
          /*expect(res.body).to.be.an('array');*/
          /*expect(res.body).to.have.lengthOf(2);*/
          /*done();*/
        /*});*/
    /*});*/
  /*});*/
/*})*/;
