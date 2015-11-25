var _ = require( 'lodash' );
var GitHubStrategy = require( 'passport-github2' ).Strategy;
var githubApi = require( './githubApi' );

function loadUserRoles( accessToken, teamRoleMap, defaultRoles, org, done ) {
	if( !teamRoleMap ) {
		return done( null, defaultRoles );
	}

	githubApi.loadUserTeams( accessToken, function( err, teams ) {
		if( err ) {
			return done( err );
		}

		org = org.toLowerCase();
		var roles = teams.reduce( function( result, team ) {
			if( team.organization.login.toLowerCase() !== org ) {
				return result;
			}

			return result.concat( teamRoleMap[ team.name.toLowerCase() ] || [] );
		}, [] );

		done( null, _.uniq( roles.concat( defaultRoles ) ) );
	} );
}

module.exports = function ( config ) {
	var org = config.github.organization;
	var roles = config.roles;
	var defaultRoles = config.defaultRoles || [];

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
		clientID: config.github.clientId,
		clientSecret: config.github.clientSecret,
		callbackUrl: config.github.callbackUrl
	}, function( accessToken, refreshToken, profile, done ) {
		if( !org ) {
			return process.nextTick( function() {
				done( null, profile );
			});
		}

		githubApi.validateUserOrg( accessToken, profile.username, org, function( err, isOrgMember ) {
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

	return github;
};
