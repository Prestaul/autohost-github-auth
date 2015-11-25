require( './setup' );
var githubStrategy = require( '../src/githubStrategy' );
var teamsResponse = require( "./mocks/teams-response" );

function mockGithubCalls(opts) {
	nock('https://github.com:443', { "encodedQueryParams": true })
		.post(
			'/login/oauth/access_token',
			"grant_type=authorization_code&redirect_uri=&client_id=THE_CLIENT_ID&client_secret=THE_CLIENT_SECRET&code=THE_OATH_CODE"
		)
		.reply(200, "access_token=THE_ACCESS_TOKEN&scope=read%3Aorg%2Cuser%3Aemail&token_type=bearer", {
			'content-type': 'application/x-www-form-urlencoded; charset=utf-8'
		});

	nock('https://api.github.com:443', { "encodedQueryParams": true })
		.get('/user')
		.reply(200, {
			"id": 1337,
			"type": "User",
			"login": "JohnnyDeveloper",
			"name": "Johnny Developer",
			"company": "Example Inc."
		}, {
			'content-type': 'application/json; charset=utf-8'
		});

	nock('https://api.github.com:443', { "encodedQueryParams": true })
		.get('/user/emails')
		.reply(200, [{
			"email": "JohnnyDeveloper@example.net",
			"primary": true,
			"verified":true
		}], { 'content-type': 'application/json; charset=utf-8' });

	if(opts.isOrgMember === true) {
		nock( "https://api.github.com/" )
			.get( "/orgs/ExampleInc/members/JohnnyDeveloper" )
			.reply( 204 );
	}

	if(opts.isOrgMember === false) {
		nock( "https://api.github.com/" )
			.get( "/orgs/ExampleInc/members/JohnnyDeveloper" )
			.reply( 404 );
	}

	if(opts.mockTeams) {
		nock( "https://api.github.com" )
			.get( "/user/teams" )
			.reply( 200, opts.mockTeams );
	}
}

function mockGetOAuthAccessToken( strategy ) {
	strategy._oauth2.getOAuthAccessToken = function(code, options, callback) {
		if (options.grant_type !== 'authorization_code') { return callback(null, 'wrong-access-token', 'wrong-refresh-token'); }

		if (code == 'THE_OATH_CODE' && options.redirect_uri == 'https://www.example.net/auth/example/callback') {
			return callback(null, 'THE_ACCESS_TOKEN', 'THE_REFRESH_TOKEN', { token_type: 'example' });
		} else {
			return callback(null, 'wrong-access-token', 'wrong-refresh-token');
		}
	};

	return strategy;
}

describe("GitHub Strategy Wrapper", function() {
	describe("configured without an organization", function() {
		var strategy = githubStrategy({
			github: {
				clientId: "THE_CLIENT_ID",
				clientSecret: "THE_CLIENT_SECRET"
			},
			defaultRoles: [ "user" ]
		});

		mockGetOAuthAccessToken( strategy );

		describe("with authenticated user", function() {
			var user;

			before( function( done ) {
				mockGithubCalls({});

				chai.passport.use(strategy)
					.success(function(u) {
						user = u;
						done();
					})
					.req(function(req) {
						req.query = {};
						req.query.code = 'THE_OATH_CODE';
					})
					.authenticate();
			} );

			it("should load the user", function() {
				user.should.be.an("object");
				user.id.should.be.equal( '1337' );
				user.username.should.be.equal( 'JohnnyDeveloper' );
				user.displayName.should.be.equal( 'Johnny Developer' );
				user.emails.should.eql([{
					value: 'JohnnyDeveloper@example.net'
				}]);
			});

			it("should not try to load roles", function() {
				should.not.exist( user.roles );
			});
		});
	});

	describe("configured with an organization", function() {
		var strategy = githubStrategy({
			github: {
				organization: "ExampleInc",
				clientId: "THE_CLIENT_ID",
				clientSecret: "THE_CLIENT_SECRET"
			},
			defaultRoles: [ "user" ]
		});

		mockGetOAuthAccessToken( strategy );

		describe("with authenticated user in org", function() {
			var user;

			before( function( done ) {
				mockGithubCalls({
					isOrgMember: true
				});

				chai.passport.use(strategy)
					.success(function(u) {
						user = u;
						done();
					})
					.req(function(req) {
						req.query = {};
						req.query.code = 'THE_OATH_CODE';
					})
					.authenticate();
			} );

			it("should load the user", function() {
				user.should.be.an("object");
				user.id.should.be.equal( '1337' );
				user.username.should.be.equal( 'JohnnyDeveloper' );
				user.displayName.should.be.equal( 'Johnny Developer' );
				user.emails.should.eql([{
					value: 'JohnnyDeveloper@example.net'
				}]);
			});

			it("should add default roles to the user", function() {
				user.roles.should.eql([ 'user' ]);
			});
		});

		describe("with authenticated user not in org", function() {
			var error;

			before( function( done ) {
				mockGithubCalls({
					isOrgMember: false
				});

				chai.passport.use(strategy)
					.fail(function( err ) {
						error = err;
						done();
					})
					.req(function(req) {
						req.query = {};
						req.query.code = 'THE_OATH_CODE';
					})
					.authenticate();
			} );

			it("should fail to authenticate", function() {
				should.exist(error);
			});

			it("should have the correct error message", function() {
				error.should.eql( {
					message: 'User is not a member of the ExampleInc organization.'
				} );
			});
		});
	});


	describe("configured with org and roles", function() {
		var strategy = githubStrategy({
			github: {
				organization: "ExampleInc",
				clientId: "THE_CLIENT_ID",
				clientSecret: "THE_CLIENT_SECRET"
			},
			roles: {
				admin: [ "Admins" ],
				developer: [ "Developers", "Admins" ],
				readonly: [ "Testers" ]
			},
			defaultRoles: [ "user" ]
		});

		mockGetOAuthAccessToken( strategy );

		describe("with authenticated user in org", function() {
			var user;

			before( function( done ) {
				mockGithubCalls({
					isOrgMember: true,
					mockTeams: [{
						name: "Developers",
						organization: {
							login: "ExampleInc"
						}
					}]
				});

				chai.passport.use(strategy)
					.success(function(u) {
						user = u;
						done();
					})
					.req(function(req) {
						req.query = {};
						req.query.code = 'THE_OATH_CODE';
					})
					.authenticate();
			} );

			it("should load the user", function() {
				user.should.be.an("object");
				user.id.should.be.equal( '1337' );
				user.username.should.be.equal( 'JohnnyDeveloper' );
				user.displayName.should.be.equal( 'Johnny Developer' );
				user.emails.should.eql([{
					value: 'JohnnyDeveloper@example.net'
				}]);
			});

			it("should add correct roles to the user", function() {
				user.roles.should.eql([ 'developer', 'user' ]);
			});
		});
	});

});
