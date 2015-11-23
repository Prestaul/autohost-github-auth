var request = require( "request" );

module.exports = {
	validateUserOrg: function ( accessToken, username, org, done ) {
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
	},

	loadUserTeams: function ( accessToken, done ) {
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
};
