'use strict';

var path = require('path');
var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var watchify = require('watchify');
var browserify = require('browserify');
var less = require('gulp-less');
var gulpif = require('gulp-if');
var jshint = require('gulp-jshint');
var source = require('vinyl-source-stream');
var postcss = require('gulp-postcss');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');

var browserifyOpts = assign({}, watchify.args, {
    entries: ['./src/index.js'],
    debug: true
});
var bwatch = watchify(browserify(browserifyOpts));

// browserify
gulp.task('js', bundle);
bwatch.on('update', bundle);
bwatch.on('log', gutil.log);

function bundle() {
    return bwatch.bundle()
        // log errors if they happen
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(source('chay.js'))
        // optional, remove if you don't need to buffer file contents
        .pipe(buffer())
        // optional, remove if you dont want sourcemaps
        .pipe(sourcemaps.init({
            loadMaps: true
        })) // loads map from browserify file
        // Add transformation tasks to the pipeline here.
        .pipe(sourcemaps.write('./')) // writes .map file
        .pipe(gulp.dest('./dist'));
}

// style
gulp.task('less', function() {
    return gulp.src('demo/styles/less/*.less')
        .pipe(sourcemaps.init())
        .pipe(less({
            paths: [path.join(__dirname, 'demo/styles/less')]
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('demo/styles/css'));
});
gulp.task('styles', function() {
    return gulp.src('demo/styles/less/*.less')
        .pipe(sourcemaps.init())
        .pipe(less({
            paths: [path.join(__dirname, 'demo/styles/less')]
        }))
        .pipe(postcss([
            require('autoprefixer-core')({
                browsers: ['last 2 version']
            })
        ]))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('demo/styles'));
});

// jshint
gulp.task('jshint', function() {
    return gulp.src('src/**/*.js')
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish', { verbose: true }))
        .pipe(gulpif(!browserSync.active, jshint.reporter('fail')));
});


// serve
gulp.task('serve', ['styles', 'js'], function() {
    browserSync({
        notify: false,
        port: 4999,
        server: {
            baseDir: ['demo'],
            routes: {
                '/dist': 'dist'
            }
        }
    });

    // watch for changes
    gulp.watch([
        'demo/*.html',
        'demo/scripts/**/*.js',
        'demo/images/**/*',
        'demo/styles/*.css',
        'dist/hy.js'
    ]).on('change', reload);

    gulp.watch('demo/styles/less/*.less', ['styles']);
    //gulp.watch('demo/fonts/**/*', ['fonts']);
    //gulp.watch('bower.json', ['wiredep', 'fonts']);
    gulp.watch('src/*.js', ['js']);
});
