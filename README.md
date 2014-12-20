# reveal.js-realsense-plugin

A plugin for [reveal.js](http://lab.hakim.se/reveal-js/)
(by Hakim El Hattab) that lets you control slides via
[Intel RealSense](https://software.intel.com/realsense) input devices.

*This plugin is still in development. You may experience some issues while using it.*

## Usage / Installation

Just copy this repository into your reveal.js presentation to `/plugin/realsense`.

Include this line in the "dependencies" section in index.html:

````javascript
Reveal.initialize({
  // your options ...
  // Optional libraries used to extend on reveal.js
  dependencies: [
    { src: 'plugin/realsense/realsense.js', async: true} }
  ]
});
````
