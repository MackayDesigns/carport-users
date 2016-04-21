var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var install = require('gulp-install');
var runSequence = require('run-sequence');
var awsLambda = require("node-aws-lambda");
var mocha = require('gulp-mocha');

// deploy all source files that are not in the node_modules and test directories
var deployFiles = [
  './**/*.js',
  '!./node_modules/**/*.js',
  '!./test/**/*.js',
  '!./lambda-config.js'
];

gulp.task('clean', () => {
  return del(['./dist', './dist.zip']);
});

gulp.task('copy', () => {
  return gulp.src(deployFiles)
    .pipe(gulp.dest('dist/'));
});

gulp.task('npm-install', () => {
  return gulp.src('./package.json')
    .pipe(gulp.dest('dist/'))
    .pipe(install({
      production: true
    }));
});

gulp.task('zip', () => {
  return gulp.src(['dist/**/*', '!dist/package.json'])
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest('./'));
});

gulp.task('upload', (callback) => {
  awsLambda.deploy('./dist.zip', require("./lambda-config.js"), callback);
});

gulp.task('deploy', (callback) => {
  return runSequence(
    ['clean'], ['copy', 'npm-install'], ['zip'], ['upload'],
    callback
  );
});

gulp.task('test', function () {
  return gulp.src('test/*.js', {
      read: false
    })
    // gulp-mocha needs filepaths so you can't have any plugins before it
    .pipe(mocha());
});