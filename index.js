/*
 * grunt-prompts
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

// Nodejs libs.
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

// External libs.
var semver = require('semver');
var _ = require('lodash');

var prompt = module.exports = {};

// Internal libs.
var git = prompt.git = require('./lib/git');

// Returns the available licenses supplied by this lib
prompt.availableLicenses = function(license) {
  if (license) {
    return path.join(__dirname, 'licenses', 'LICENSE-' + license);
  }
  return fs.readdirSync(path.join(__dirname, 'licenses')).map(function(license) {
    return path.basename(String(license)).replace(/^LICENSE-/, '');
  });
};

// Sets the default value for a grunt prompt
prompt.default = function(prompt, data, done) {
  var returnPrompt = _.clone(prompt);
  function setdefault(err, def) {
    if (!def || def === '') {
      def = 'none';
    }
    returnPrompt.default = def;
    done(returnPrompt);
  }
  if (typeof prompt.default === 'function') {
    prompt.default(prompt.name, data, setdefault);
  } else {
    setdefault(null, prompt.default);
  }
};

// Validates a prompt return value
prompt.validate = function(prompt, value, data, done) {
  var sanitize = prompt.sanitize ? prompt.sanitize : function(value, data, done) { done(value); };
  sanitize(value, data, function() {
    // If we got a sanitized value back
    if (arguments.length === 1) {
      value = arguments[0];
    }
    var valid = true;
    if (typeof prompt.validator === 'function') {
      valid = prompt.validator(value);
    } else if (prompt.validator) {
      valid = prompt.validator.test(value);
    }
    done(valid, value);
  });
};

// Built-in prompt options.
// These generally follow the node "prompt" module convention, except:
// * The "default" value can be a function which is executed at run-time.
// * An optional "sanitize" function has been added to post-process data.
prompt.defaults = function(promptFor) {
  var defaultPrompts = {
    name: {
      message: 'Project name',
      'default': function(value, data, done) {
        var types = ['javascript', 'js'];
        if (data.type) { types.push(data.type); }
        var type = '(?:' + types.join('|') + ')';
        // This regexp matches:
        //   leading type- type. type_
        //   trailing -type .type _type and/or -js .js _js
        var re = new RegExp('^' + type + '[\\-\\._]?|(?:[\\-\\._]?' + type + ')?(?:[\\-\\._]?js)?$', 'ig');
        // Strip the above stuff from the current dirname.
        var name = path.basename(process.cwd()).replace(re, '');
        // Remove anything not a letter, number, dash, dot or underscore.
        name = name.replace(/[^\w\-\.]/g, '');
        done(null, name);
      },
      validator: /^[\w\-\.]+$/,
      warning: 'Must be only letters, numbers, dashes, dots or underscores.',
      sanitize: function(value, data, done) {
        // An additional value, safe to use as a JavaScript identifier.
        data.js_safe_name = value.replace(/[\W_]+/g, '_').replace(/^(\d)/, '_$1');
        // An additional value that won't conflict with NodeUnit unit tests.
        data.js_test_safe_name = data.js_safe_name === 'test' ? 'myTest' : data.js_safe_name;
        // If no value is passed to `done`, the original property isn't modified.
        done();
      }
    },
    title: {
      message: 'Project title',
      'default': function(value, data, done) {
        var title = data.name || '';
        title = title.replace(/[\W_]+/g, ' ');
        title = title.replace(/\w+/g, function(word) {
          return word[0].toUpperCase() + word.slice(1).toLowerCase();
        });
        done(null, title);
      },
      warning: 'May consist of any characters.'
    },
    description: {
      message: 'Description',
      'default': 'The best project ever.',
      warning: 'May consist of any characters.'
    },
    version: {
      message: 'Version',
      'default': function(value, data, done) {
        // Get a valid semver tag from `git describe --tags` if possible.
        exec('git describe --tags', function(err, stdout) {
          stdout = String(stdout).split('-')[0];
          done(null, semver.valid(stdout) || '0.1.0');
        });
      },
      validator: semver.valid,
      warning: 'Must be a valid semantic version (semver.org).'
    },
    repository: {
      message: 'Project git repository',
      'default': function(value, data, done) {
        // Change any git@...:... uri to git://.../... format.
        git.origin(function(err, result) {
          if (err) {
            // Attempt to guess at the repo name. Maybe we'll get lucky!
            result = 'git://github.com/' + (process.env.USER || process.env.USERNAME || '???') + '/' +
              path.basename(process.cwd()) + '.git';
          } else {
            result = result.replace(/^git@([^:]+):/, 'git://$1/');
          }
          done(null, result);
        });
      },
      sanitize: function(value, data, done) {
        // An additional computed "git_user" property.
        var repo = git.githubUrl(data.repository);
        var parts;
        if (repo != null) {
          parts = repo.split('/');
          data.git_user = parts[parts.length - 2];
          data.git_repo = parts[parts.length - 1];
          done();
        } else {
          // Attempt to pull the data from the user's git config.
          exec('git config --get github.user', function(err, stdout) {
            data.git_user = String(stdout.trim()) || process.env.USER || process.env.USERNAME || '???';
            data.git_repo = path.basename(process.cwd());
            done();
          });
        }
      },
      warning: 'Should be a public git:// URI.'
    },
    homepage: {
      message: 'Project homepage',
      // If GitHub is the origin, the (potential) homepage is easy to figure out.
      'default': function(value, data, done) {
        done(null, git.githubUrl(data.repository) || 'none');
      },
      warning: 'Should be a public URL.'
    },
    bugs: {
      message: 'Project issues tracker',
      // If GitHub is the origin, the issues tracker is easy to figure out.
      'default': function(value, data, done) {
        done(null, git.githubUrl(data.repository, 'issues') || 'none');
      },
      warning: 'Should be a public URL.'
    },
    licenses: {
      message: 'Licenses',
      'default': 'MIT',
      //validator: /^[\w\-\.\d]+(?:\s+[\w\-\.\d]+)*$/,
      warning: 'Must be zero or more space-separated licenses. Built-in ' +
        'licenses are: ' + prompt.availableLicenses().join(' ') + ', but you may ' +
        'specify any number of custom licenses.',
      // Split the string on spaces.
      sanitize: function(value, data, done) { done(value.split(/\s+/)); }
    },
    author_name: {
      message: 'Author name',
      'default': function(value, data, done) {
        exec('git config --get user.name', function(err, stdout) {
          if (err) { return done(err); }
          done(null, stdout.trim());
        });
      },
      warning: 'May consist of any characters.'
    },
    author_email: {
      message: 'Author email',
      'default': function(value, data, done) {
        exec('git config --get user.email', function(err, stdout) {
          if (err) { return done(err); }
          done(null, stdout.trim());
        });
      },
      warning: 'Should be a valid email address.'
    },
    author_url: {
      message: 'Author url',
      'default': 'none',
      warning: 'Should be a public URL.'
    },
    jquery_version: {
      message: 'Required jQuery version',
      'default': '*',
      warning: 'Must be a valid semantic version range descriptor.'
    },
    node_version: {
      message: 'What versions of node does it run on?',
      'default': '>= 0.8.0',
      warning: 'Must be a valid semantic version range descriptor.'
    },
    main: {
      message: 'Main module/entry point',
      'default': function(value, data, done) {
        done(null, 'lib/' + data.slugname + '.js');
      },
      warning: 'Must be a path relative to the project root.'
    },
    bin: {
      message: 'CLI script',
      'default': function(value, data, done) {
        done(null, 'bin/' + data.slugname);
      },
      warning: 'Must be a path relative to the project root.'
    },
    npm_test: {
      message: 'Npm test command',
      'default': 'grunt nodeunit',
      warning: 'Must be an executable command.'
    },
    grunt_version: {
      message: 'What versions of grunt does it require?',
      'default': '~0.4.1',
      warning: 'Must be a valid semantic version range descriptor.'
    },
    travis: {
      message: 'Will this project be tested with Travis CI?',
      'default': 'Y/n',
      warning: 'If selected, you must enable Travis support for this project in https://travis-ci.org/profile'
    },
  };

  return promptFor.map(function(name) {
    if (defaultPrompts[name]) {
      var obj = defaultPrompts[name];
      obj.name = name;
      name = obj;
    }
    return name;
  });
};
