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

	function deserializeUser( user, done ) {
		done( null, user);
	}

	function serializeUser( user, done ) {
		done( null, user );
	}

	function validateUserOrg( accessToken, username, org, done ) {
		request( {
			method: "GET",
			url: 'https://api.github.com/orgs/' + org + '/members/' + username,
			headers: {
				"User-Agent": "nodejs",
				"Authorization": "token " + accessToken
			}
		}, function( err, res ) {
			if( err ) {
				return done( err );
			}

			if( res.statusCode !== 204 ) {
				// This user ain't with us
				return done( null, false );
			}

			done( null, true );
		} );
	}

	function loadUserTeams( accessToken, done ) {
		request( {
			method: "GET",
			url: 'https://api.github.com/user/teams',
			headers: {
				"User-Agent": "nodejs",
				"Authorization": "token " + accessToken
			},
			json: true
		}, function( err, res, body ) {
			done( err, body );
		} );
	}

	function loadUserRoles( accessToken, teamRoleMap, defaultRoles, org, done ) {
		if( !teamRoleMap ) {
			return done( null, defaultRoles );
		}

		loadUserTeams( accessToken, function( err, teams ) {
			if( err ) {
				return done( err );
			}

			var roles = teams.reduce( function( roles, team ) {
				if( team.organization.login !== org ) {
					return roles;
				}

				return roles.concat( teamRoleMap[ team.name.toLowerCase() ] || [] );
			}, [] );

			done( null, _.uniq( roles.concat( defaultRoles ) ) );
		});
	}

	function initGitHubStrategy( config ) {
		var org = config.auth.github.organization;
		var roles = config.auth.roles;
		var defaultRoles = config.auth.defaultRoles || [];

		// Create map of team->roles for faster lookup
		var teamRoleMap = roles && _.reduce( roles, function( map, teams, role ) {
			teams.forEach( function( team ) {
				team = team.toLowerCase();

				if( !map[ team ] ) {
					map[ team ] = [];
				}

				map[ team ].push( role );
			} );

			return map;
		}, {} );

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

				if( !org ) {
					return done( null, profile );
				}

				validateUserOrg( accessToken, profile.username, org, function( err, isOrgMember ) {
					if( err ) {
						return done( err );
					}

					if( !isOrgMember ) {
						return done( null, false, { message: "User is not a member of the " + org + " organization." } );
					}

					loadUserRoles( accessToken, teamRoleMap, defaultRoles, org, function( err, roles ) {
						if( err ) {
							return done( err );
						}

						profile.roles = roles;
						done( null, profile );
					} );
				} );

			} );
		} );

		return github;
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
			initGitHubStrategy( config )
		],
		updateActions: function () { return when( true ); }
	};

	return wrapper;
};
