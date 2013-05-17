# grunt-prompts

> Built-in prompts for a grunt style generator.

The core of this lib comes from `grunt-init` originally written by "Cowboy" Ben Alman and contributors. `grunt-init` will be deprecated by [yeoman generator](https://github.com/yeoman/generator). The intent of this lib is to supply the existing `grunt-init` prompts to generators.

## Install

`npm install grunt-prompts --save`

## Example
Get some built-in prompts:

```js
var prompts = require('grunt-prompts');
var p = prompts.defaults([
  'name',
  'description',
  'version',
  {
    name: 'custom',
    message: 'Im not a built-in prompt'
  }
]);
```

Default a prompt:

```js
prompt.default = function(value, props, done) {
  done(null, 'Default value!');
};
prompts.default(prompt, this.props, function(prompt) {
  // prompt.default === now equals 'Default value!'
});
```

Sanitize and validate a prompt value:

```js
prompt.validate = /^[\w\-\.]+$/;
prompt.sanitize = function(value, data, done) {
  done('cleaned ' + value);
};
prompts.validate(prompt, value, this.props, function(valid, value) {
  if (!valid) {
    console.log('oh no!');
  } else {
    console.log(value + ' is valid.');
  }
});
```

## API

### `var prompts = require('grunt-prompts')`

#### `prompts.availableLicenses([license])`
Returns an array of available licenses. Currently those are `Apache-2.0`, `GPL-2.0`, `MIT`, `MPL-2.0`. If you specify a `license` it will return the absolute filepath to that license.

#### `prompts.defaults(prompts)`
Pass an array of prompt names to return a list of corresponding built-in prompts.

#### `prompts.default(prompt, data, done)`
Will run/set `prompt.default` to determine a default value for the prompt. `data` supplies a object of all the current collected data. `done(prompt)` is a callback that is supplied a prompt with a default value.

#### `prompts.validate(prompt, value, data, done)`
Will sanitize and/or validate the prompt value. `done(valid, value)` is a callback that is supplied a boolean whether the value is `valid` and the sanitized new `value`.

#### `prompts.git.origin(done)`
Get the git origin url from the current repo. `done(err, origin)` is a callback supplied with the `origin` if found.

#### `prompts.git.githubUrl(uri, suffix)`
Generate a GitHub web URL from a GitHub repo URI.

#### `prompts.packageJSON(data)`
Builds a `package.json` file from `data` and returns as a string.
