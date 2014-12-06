module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %>, v<%= pkg.version %>, <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/realsense.js',
        dest: 'build/realsense.min.js'
      }
    },

    concat: {
      options: {
        separator: '\n'
      },
      dist: {
        src: ['build/realsense.min.js'],
        dest: 'realsense.js'
      }
    },

    watch: {
      scripts: {
        files: ['src/**/*.js'],
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


  grunt.registerTask('default', ['uglify', 'concat']);

};