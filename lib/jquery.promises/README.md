# jQuery.Promises

Handling collections of jQuery Deferreds with $.Promises.

## What are $.Promises?

The `$.Promises` object is a convenience wrapper around arrays of jQuery Deferreds or promises. It helps you to collect Deferreds and add new ones later on, to delay their resolution and pass them to [`$.when`][jquery-when] even before all Deferreds of the collection are set up.

In short, a `$.Promises` collection provides an an easy-to-read API for managing related Deferreds as a group, and for controlling their behaviour.

## Dependencies and setup

jQuery.Promises is an extension for jQuery and requires jQuery 1.6.0 or newer. Include jquery.promises.js after jQuery is ready.

The stable version of jQuery.Promises is available in the `dist` directory ([dev][dist-dev], [prod][dist-prod]), including an AMD build ([dev][dist-amd-dev], [prod][dist-amd-prod]). If you use Bower, fetch the files with `bower install jquery.promises`. With npm, it is `npm install jquery.promises`.

## Making Promises is easy - postponing them, too

Here's how Promises work. We begin with a bit of bread-and-butter stuff:

```javascript
var myPromises = new $.Promises();
```

'`new`' is optional. We don't have to add Deferreds to the collection at this point, but we can:

```javascript
var myPromises = $.Promises( dfd1, dfd2 );
```

This creates an aggregate promise which will resolve or fail according to the Deferreds 'inside' of it.

```javascript
myPromises.done( ... ).fail( ... );
$.when( myPromises ).done( ... );
```

Now here's the thing. We can add more promises or Deferreds to the collection even if the current ones have all resolved. We just need to treat these Promises like new-year resolutions, and `postpone()` them.

```javascript
// We delay the resolution of our promises and add some more
myPromises.postpone()
          .add( dfd3, dfd4 );

// Now we attach a done handler
$.when( myPromises ).done( whatever );

// ... and resolve all promises.
dfd1.resolve( somearg ); dfd2.resolve(); // ... etc for all Deferreds
```

That would resolve the collection if we had not postponed it. But we have, so we can still add more stuff, and `$.when` will wait for us to finish:

```javascript
// $.when( myPromises ), called earlier, will respond to these additions
myPromises.add( dfd5 );
...
```

When all is set up, `$.when` will act on the updated collection. This can't be done with ordinary arrays of promises. Finally,

```javascript
myPromises.stopPostponing();
```

will unblock the resolution or rejection of the aggregated promises. `$.when` will now respond to their state.

## The API

- `$.Promises( [deferred, [deferred]] )`

  Constructor, returns a new Promises object. A list of promises can be passed as arguments (optional). Can be called with or without '`new`'.

- `.add( promise, [promise] )`

  Adds one or more promises to the collection. Also accepts Deferreds. Returns the Promises object.

- `.postpone()`

  Blocks the resolution of the aggregate Promises. Returns the Promises object.

  Calling `.postpone()` is useful

    + if you pass Promises to `$.when` while you are still adding new promises to the collection, and want them to impact `$.when()`
    + if you attach `.done()` and `.fail()` handlers early, before you have made all your promises
    + if you are in the process of gathering promises while the ones you have already added might resolve at any time. If all of them resolve, so does the collection - unless you have called `postpone()` to keep the collection open for more promises.

- `.stopPostponing()`

  Unblocks the resolution of the collected promises if it has been delayed by `postpone()`. Returns the Promises object.

- `.ignoreBelated( [yesno] )`

  Makes the Promise object ignore attempts to add promises, or call `postpone()`, when it is too late. Normally, these actions throw a `PromisesError` exception if they happen after the eventual resolution or failure of the Promise.

  Can be turned off again by calling `.ignoreBelated( false )`. Returns the Promises object.
- `.isUnresolved()`

  Returns if the Promises object is still unresolved.

## A caveat

The `$.Promises` object is not built with maximum performance in mind. [Look at the code][src] - you won't see any of the 'low-level' stuff which makes up the jQuery implementation of Deferreds. Rather, `$.Promises` is built on top of Deferreds. As a result, the code easy to read and maintain, but the implementation is not as efficient as it would otherwise be. That's the trade-off.

## Build process and tests

If you'd like to fix, customize or otherwise improve the project: here are your tools.

### Setup

[npm][] and [Bower][] set up the environment for you.

- The only thing you've got to have on your machine is [Node.js]. Download the installer [here][Node.js].
- Open a command prompt in the project directory.
- Run `npm install`. (Creates the environment.)
- Run `bower install`. (Fetches the dependencies of the script.)

Your test and build environment is ready now. If you want to test against specific versions of jQuery, edit `bower.json` first.

### Running tests, creating a new build

The test tool chain: [Grunt][] (task runner), [Karma][] (test runner), [QUnit][] (test framework). The good news: you don't need to worry about any of this.

A handful of commands manage everything for you:

- Run the tests in a terminal with `grunt test`.
- Run the tests in a browser interactively, live-reloading the page when the source or the tests change: `grunt interactive`.
- Build the dist files (also running tests and linter) with `grunt build`, or just `grunt`.
- Build continuously on every save with `grunt ci`.
- Change the version number throughout the project with `grunt setver --to=1.2.3`. Or just increment the revision with `grunt setver --inc`. (Remember to rebuild the project with `grunt` afterwards.)
- `grunt getver` will quickly tell you which version you are at.

Finally, if need be, you can set up a quick demo page to play with the code. First, edit the files in the `demo` directory. Then display `demo/index.html`, live-reloading your changes to the code or the page, with `grunt demo`. Libraries needed for the demo/playground should go into the Bower dev dependencies, in the project-wide `bower.json`, or else be managed by the dedicated `bower.json` in the demo directory.

_The `grunt interactive` and `grunt demo` commands spin up a web server, opening up the **whole project** to access via http. By default, that access is restricted to localhost. You can relax the restriction in `Gruntfile.js`, but be aware of the security implications._

### Changing the tool chain configuration

In case anything about the test and build process needs to be changed, have a look at the following config files:

- `karma.conf.js` (changes to dependencies, additional test frameworks)
- `Gruntfile.js`  (changes to the whole process)
- `web-mocha/_index.html` (changes to dependencies, additional test frameworks)

New test files in the `spec` directory are picked up automatically, no need to edit the configuration for that.

## License

MIT.

Copyright (c) 2011-2014 Michael Heim.

[src]: https://github.com/hashchange/jquery.promises/blob/master/src/jquery.promises.js "Source of jquery.promises.js"

[dist-dev]: https://raw.github.com/hashchange/jquery.promises/master/dist/jquery.promises.js "jquery.promises.js"
[dist-prod]: https://raw.github.com/hashchange/jquery.promises/master/dist/jquery.promises.min.js "jquery.promises.min.js"
[dist-amd-dev]: https://raw.github.com/hashchange/jquery.promises/master/dist/amd/jquery.promises.js "jquery.promises.js, AMD build"
[dist-amd-prod]: https://raw.github.com/hashchange/jquery.promises/master/dist/amd/jquery.promises.min.js "jquery.promises.min.js, AMD build"

[Node.js]: http://nodejs.org/ "Node.js"
[Bower]: http://bower.io/ "Bower: a package manager for the web"
[npm]: https://npmjs.org/ "npm: Node Packaged Modules"
[Grunt]: http://gruntjs.com/ "Grunt: The JavaScript Task Runner"
[Karma]: http://karma-runner.github.io/ "Karma - Spectacular Test Runner for Javascript"
[QUnit]: http://qunitjs.com/ "QUnit: A JavaScript Unit Testing framework"
[JSHint]: http://www.jshint.com/ "JSHint, a JavaScript Code Quality Tool"

[jquery-when]: http://api.jquery.com/jQuery.when/ "jQuery API documentation: jQuery.when()"