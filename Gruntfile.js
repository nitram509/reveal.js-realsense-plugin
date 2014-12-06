module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    typescript: {
      main: {
        src: ['src/**/*.ts'],
        dest: 'build/generated',
        options: {
          //module: 'namespace',
          target: 'e35',
          basePath: 'src/',
          sourceMap: false,
          declaration: false
        }
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %>, v<%= pkg.version %>, <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'build/generated/realsense.js',
        dest: 'build/realsense.min.js'
      }
    },

    concat: {
      options: {
        separator: '\n// *************************************************************************** //\n'
      },
      dist: {
        src: ['build/realsense.min.js', 'lib/realsense-3.0.js', 'lib/realsenseinfo-3.0.js' ],
        dest: 'realsense.js'
      }
    },

    watch: {
      scripts: {
        files: ['src/**/*.*'],
        tasks: ['default'],
        options: {
          spawn: false
        }
      }
    }

  });


  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-typescript');

  grunt.registerTask('default', ['typescript', 'uglify', 'concat']);

};