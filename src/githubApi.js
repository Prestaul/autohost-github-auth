var pkg = require( "../package.json" );
var url = require( "url" );
var request = require( "request" );

function fetch( token, path, done ) {
	request( {
		method: "GET",
		url: url.resolve( "https://api.github.com", path),
		headers: {
			"User-Agent": "autohost-github-auth/" + pkg.version,
			"Authorization": "token " + token
		},
		json: true
	}, function( err, res, body ) {
		if ( err ) {
			return done( err );
		}

		return done( null, res, body );
	} );
}

module.exports = {
	validateUserOrg: function ( accessToken, username, org, done ) {
		var path = "/orgs/" + org + "/members/" + username;
		return fetch( accessToken, path, function ( err, res, body ) {
			if( err ) {
				return done(err);
			}

			switch( res.statusCode ) {
				case 204: return done( null, true );
				case 404: return done( null, false );

				// Don't pretend we understand anything other than 204 and 404
				default: done( new Error( "HTTP error. Status: " + res.statusCode ) );
			}
		} );
	},

	loadUserTeams: function ( accessToken, done ) {
		var path = "/user/teams";
		fetch( accessToken, path, function ( err, res, body ) {
			if( err ) {
				return done(err);
			}

			if( res.statusCode < 200 || res.statusCode >= 300 ) {
				return done( new Error( "HTTP error. Status: " + res.statusCode ), res, body );
			}

			done( null, body );
		} );
	}
};
