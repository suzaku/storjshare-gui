'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var expect = require('chai').expect;
var DataServWrapper = require('../../lib/dataserv');
var Logger = require('../../lib/logger');
var Tab = require('../../lib/tab');
var os = require('os');
var EventEmitter = require('events').EventEmitter;
var fakeipc = new EventEmitter();

process.setMaxListeners(0);

fakeipc.send = function(ns, data) {
  this.emit(ns, data);
};

describe('DataServWrapper', function() {

  describe('@constructor', function() {

    it('should create instance without the `new` keyword', function() {
      expect(DataServWrapper(os.tmpdir())).to.be.instanceOf(DataServWrapper);
    });

    it('should create instance with the `new` keyword', function() {
      expect(
        new DataServWrapper(os.tmpdir())
      ).to.be.instanceOf(DataServWrapper);
    });

    it('should listen for process exit', function() {
      DataServWrapper(os.tmpdir());
      expect(process._events.exit).to.not.equal(undefined);
    });

  });

  describe('#_bootstrap', function() {

    it('should spawn a child process and setup listeners', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var fakeproc = dataserv._bootstrap('some_id', 'SOME_NAME', ['--arg']);
      expect(dataserv._current.some_id).to.equal('SOME_NAME');
      expect(fakeproc._logger).to.be.instanceOf(Logger);
      expect(fakeproc.stdout._events.data).to.not.equal(undefined);
      expect(fakeproc.stderr._events.data).to.not.equal(undefined);
    });

  });

  describe('#farm', function() {

    it('should bootstrap the farm command', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var tab = new Tab();
      var fakeproc = dataserv.farm(tab);
      var expected = dataserv._exec + ' --config_path=' + dataserv._datadir +
                     '/drives/' + tab.id + ' --store_path= --max_size=0GB ' +
                     'farm\n';
      expect(fakeproc._logger._output).to.equal(expected);
    });

  });

  describe('#build', function() {

    it('should bootstrap the build command', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var tab = new Tab();
      var fakeproc = dataserv.build(tab);
      var expected = dataserv._exec + ' --config_path=' + dataserv._datadir +
                     '/drives/' + tab.id + ' --store_path= --max_size=0GB ' +
                     'build\n';
      expect(fakeproc._logger._output).to.equal(expected);
    });

  });

  describe('#register', function() {

    it('should bootstrap the register command', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var fakeproc = dataserv.register();
      var expected = dataserv._exec + ' register\n';
      expect(fakeproc._logger._output).to.equal(expected);
    });

  });

  describe('#poll', function() {

    it('should bootstrap the poll command', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var fakeproc = dataserv.poll();
      var expected = dataserv._exec + ' poll\n';
      expect(fakeproc._logger._output).to.equal(expected);
    });

  });

  describe('#setAddress', function() {

    it('should bootstrap the config command', function(done) {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          execFile: function(program, args, callback) {
            callback(null, program + ' ' + args.join(' '));
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var tab = new Tab();
      var expected = dataserv._exec + ' --config_path=' + os.tmpdir() +
                     '/drives/' + tab.id + ' config --set_payout_address=1234';
      dataserv.setAddress('1234', tab.id, function(err, res) {
        expect(expected).to.equal(res);
        done();
      });
    });

  });

  describe('#validateClient', function() {

    it('should bubble error from execFile', function(done) {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          execFile: function(program, args, callback) {
            callback(new Error('Unknown error'));
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      dataserv.validateClient(dataserv._exec, function(err) {
        expect(err.message).to.equal('Unknown error');
        done();
      });
    });

    it('should use stderr if the platform is `darwin`', function(done) {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          execFile: function(program, args, callback) {
            callback(null, '', 'v1.0.0');
          }
        },
        os: {
          platform: function() {
            return 'darwin';
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      dataserv.validateClient(dataserv._exec, function(err) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should return error if no version is returned', function(done) {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          execFile: function(program, args, callback) {
            callback(null, '', '');
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      dataserv.validateClient(dataserv._exec, function(err) {
        expect(err.message).to.equal('Invalid dataserv-client');
        done();
      });
    });

    it('should not return an error if all is good', function(done) {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          execFile: function(program, args, callback) {
            callback(null, 'v1.0.0', '');
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      dataserv.validateClient(dataserv._exec, function(err) {
        expect(err).to.equal(null);
        done();
      });
    });

  });

  describe('#terminate', function() {

    it('should terminate the process running under the id', function() {
      var DataServWrapper = proxyquire('../../lib/dataserv', {
        child_process: {
          spawn: function() {
            return {
              stdout: new EventEmitter(),
              stderr: new EventEmitter(),
              kill: sinon.stub()
            };
          }
        }
      });
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var tab = new Tab();
      var fakeproc = dataserv.farm(tab);
      expect(dataserv._children[tab.id]).to.equal(fakeproc);
      dataserv.terminate(tab.id);
      expect(dataserv._children[tab.id]).to.equal(null);
      expect(fakeproc.kill.called).to.equal(true);
    });

  });

  describe('#_getConfigPath', function() {

    it('should return the config path for the id', function() {
      var dataserv = new DataServWrapper(os.tmpdir(), fakeipc);
      var configPath = dataserv._getConfigPath('test');
      expect(configPath).to.equal(os.tmpdir() + '/drives/test');
    });

  });

});