var when = require( 'when' );
var githubStrategy = require( './githubStrategy' );

module.exports = function( config ) {
	var githubAuth;
	var useSession = !( config && config.noSession );

	function authenticate( req, res, next ) {
		if ( req.path.indexOf( config.auth.authEndpoint ) === 0 ) {
			return githubAuth( req, res, next );
		}

		if ( req.path.indexOf( config.auth.loginEndpoint ) === 0 ) {
			return res.status( 500 ).send( "Login endpoint should not be authenticated" );
		}

		res.redirect( config.auth.loginEndpoint );
	}

	function deserializeUser( user, done ) {
		done( null, user);
	}

	function serializeUser( user, done ) {
		done( null, user );
	}

	var wrapper = {
		authenticate: authenticate,
		checkPermission: function () { return when( true ); },
		deserializeUser: deserializeUser,
		getActionRoles: function () { return []; },
		getUserRoles: function (user) {
			return when( user.roles );
		},
		hasUsers: function () { return when( true ); },
		initPassport: function( passport ) {
			githubAuth = passport.authenticate( 'github', { scope: ['user:email', 'read:org'], failureMessage: !!config.auth.sessionMessages, failureRedirect: config.auth.loginEndpoint, session: useSession } );
		},
		serializeUser: serializeUser,
		strategies: [
			githubStrategy( config.auth )
		],
		updateActions: function () { return when( true ); }
	};

	return wrapper;
};
