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

    copy: {
      build: {
        src: 'build/generated/realsense.js',
        dest: 'build/realsense.min.js'
      },
      "test-demo-app": {
        src: 'realsense.js',
        dest: '../reveal.js-demo-app/plugin/realsense/realsense.js'
      }
    },

    concat: {
      options: {
        separator: '\n// *************************************************************************** //\n'
      },
      dist: {
        src: ['lib/native-promise-only/lib/npo.src.js', 'lib/realsense-3.0.js', 'lib/realsenseinfo-3.0.js', 'build/realsense.min.js'],
        dest: 'realsense.js'
      }
    },

    watch: {
      scripts: {
        files: ['src/**/*.*', 'test/**/*.*'],
        tasks: ['development'],
        options: {
          spawn: false
        }
      }
    }

  });


  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-typescript');


  grunt.registerTask('default', ['typescript', 'uglify', 'concat', 'copy:test-demo-app']);
  grunt.registerTask('development', ['typescript', 'copy:build', 'concat', 'copy:test-demo-app']);

};