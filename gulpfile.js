var gulp = require( 'gulp' ),
	bg = require( 'biggulp' )( gulp );

gulp.task( 'test', function() {
	bg.testAll();
} );

gulp.task( 'coverage', function() {
	bg.withCoverage();
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'test' ] );
} );

gulp.task( 'default', [ 'test', 'watch' ], function() {
} );
