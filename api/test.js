import Mocha from 'mocha';

const mocha = new Mocha();
mocha.addFile('test/testMiscellaneous');
mocha.addFile('test/testGetProjects');
mocha.run();
