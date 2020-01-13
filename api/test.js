var Mocha = require('mocha');

var mocha = new Mocha();
mocha.addFile('test/testGetProjects');
mocha.run();
