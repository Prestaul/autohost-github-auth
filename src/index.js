var _ = require( 'lodash' );
var when = require( 'when' );
var GitHubStrategy = require( 'passport-github2' ).Strategy;

module.exports = function( config ) {
	var githubAuth;
	var useSession = !( config == undefined ? false : config.noSession );

	function authenticate( req, res, next ) {
		if ( req.path.indexOf( config.auth.authEndpoint ) === 0 ) {
			return githubAuth( req, res, next );
		}

		if ( req.path.indexOf( config.auth.loginEndpoint ) === 0 ) {
			return res.status( 500 ).send( "Login endpoint should not be authenticated" );
		}

		res.redirect( config.auth.loginEndpoint );
	}

	function deserializeUser( user, done ) { done( null, user); }

	function serializeUser( user, done ) { done( null, user ); }

	function initGitHubStrategy( config ) {
		var github = new GitHubStrategy( {
			clientID: config.auth.github.clientId,
			clientSecret: config.auth.github.clientSecret,
			callbackUrl: config.auth.github.callbackUrl
		}, function( accessToken, refreshToken, profile, done ) {
			process.nextTick( function() {
				// TODO: do we want to do anything here with authorized profile information?
				// may wish to persist the user/profile here if we ever wish to map users to
				// roles or permissions for more fine-grained control over what authenticated
				// users can or can't do in the app
				return done( null, profile );
			} );
		} );

		return github;
	}

	var wrapper = {
		authenticate: authenticate,
		checkPermission: function () { return when( true ); },
		deserializeUser: deserializeUser,
		getActionRoles: function () { return []; },
		getUserRoles: function () { return when( [] ); },
		hasUsers: function () { return when( true ); },
		initPassport: function( passport ) {
			githubAuth = passport.authenticate( 'github', { scope: ['user:email'], failureRedirect: config.auth.loginEndpoint, session: useSession } );
		},
		serializeUser: serializeUser,
		strategies: [
			initGitHubStrategy( config )
		],
		updateActions: function () { return when( true ); }
	};

	return wrapper;
}
