/*
 * grunt-prompts
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

var exec = require('child_process').exec;

var git = module.exports = {};

// Get the git origin url from the current repo (if possible).
git.origin = function(done) {
  exec('git remote -v', function(err, stdout) {
    var re = /^origin\s/;
    var lines;
    if (!err) {
      lines = String(stdout).split('\n').filter(re.test, re);
      if (lines.length > 0) {
        done(null, lines[0].split(/\s/)[1]);
        return;
      }
    }
    done(true, 'none');
  });
};

// Generate a GitHub web URL from a GitHub repo URI.
var githubUrlRegex = /^.+(?:@|:\/\/)(github.com)[:\/](.+?)(?:\.git|\/)?$/;
git.githubUrl = function(uri, suffix) {
  var matches = githubUrlRegex.exec(uri);
  if (!matches) { return null; }
  var url = 'https://' + matches[1] + '/' + matches[2];
  if (suffix) {
    url += '/' + suffix.replace(/^\//, '');
  }
  return url;
};
