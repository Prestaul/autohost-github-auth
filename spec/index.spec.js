require( "./setup" );
var GitHubAuthProvider = require( "../src" );

describe( "Autohost GitHub auth provider", function () {
	var provider;
	var defaultConfig = {
		auth: {
			github: {
				organization: "UrMom",
				clientId: "kds73osf9298fsj2f78j",
				clientSecret: "abc123ssshhhhhhhh"
			},
			roles: {
				client: [ "TeamOne" ],
				agent: [ "TeamTwo" ],
				admin: [ "TeamThree" ]
			},
			defaultRoles: [ "readonly" ]
		}
	};

	beforeEach(function () {
		provider = new GitHubAuthProvider( defaultConfig );
	});

	it( "should contain a GitHub auth strategy instance", function () {
		var GitHubStrategy = require( "passport-github2" ).Strategy;
		provider.strategies.length.should.equal( 1 );
		provider.strategies[ 0 ].should.be.an.instanceof( GitHubStrategy );
	} );
} );
