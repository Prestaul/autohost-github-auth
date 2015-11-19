var _ = require( 'lodash' );
var when = require( 'when' );
var request = require( 'request' );
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

	function validateUserOrg(accessToken, username, done) {
		request({
			method: "GET",
			url: 'https://api.github.com/orgs/' + config.auth.github.organization + '/members/' + username,
			headers: {
				"User-Agent": "nodejs",
				"Authorization": "token " + accessToken
			},
			json: true
		}, function(err, res, body) {
			if(err) {
				return done(err);
			}

			if(res.statusCode !== 204) {
				// This user ain't with us
				return done(null, false);
			}

			done( null, true );
		});
	}

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

				if(!config.auth.github.organization) {
					return done( null, profile );
				}

				validateUserOrg(accessToken, profile.username, function(err, isOrgMember) {
					if(err) {
						return done(err);
					}

					if(isOrgMember) {
						done(null, profile);
					} else {
						done(null, false, { message: "User is not a member of the " + config.auth.github.organization + " organization." });
					}
				});

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
			githubAuth = passport.authenticate( 'github', { scope: ['user:email', 'read:org'], failureMessage: !!config.auth.sessionMessages, failureRedirect: config.auth.loginEndpoint, session: useSession } );
		},
		serializeUser: serializeUser,
		strategies: [
			initGitHubStrategy( config )
		],
		updateActions: function () { return when( true ); }
	};

	return wrapper;
};
