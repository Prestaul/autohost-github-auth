require( "./setup" );
var GitHubAuthProvider = require( "../src" );

describe( "Autohost GitHub auth provider", function () {
	var provider;
	var defaultConfig = {
		auth: {
			loginEndpoint: "/auth/login",
			authEndpoint: "/auth/github",
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

	before(function () {
		provider = new GitHubAuthProvider( defaultConfig );
	});

	it( "should contain a GitHub auth strategy instance", function () {
		var GitHubStrategy = require( "passport-github2" ).Strategy;
		provider.strategies.length.should.equal( 1 );
		provider.strategies[ 0 ].should.be.an.instanceof( GitHubStrategy );
	} );

	describe( "getUserRoles", function() {
		it( "should resolve to the roles collection from the user", function() {
			var user = {
				roles: [ 'user', 'admin' ]
			};
			return provider.getUserRoles( user ).should.eventually.equal( user.roles );
		} );
	} );

	describe( "serializeUser", function() {
		it( "should return the user unaltered", function( done ) {
			var user = {
				roles: [ 'user', 'admin' ]
			};
			return provider.serializeUser( user, function( err, result ) {
				should.not.exist( err );
				result.should.equal( user );
				done();
			} );
		} );
	} );

	describe( "deserializeUser", function() {
		it( "should return the user unaltered", function( done ) {
			var user = {
				roles: [ 'user', 'admin' ]
			};
			return provider.deserializeUser( user, function( err, result ) {
				should.not.exist( err );
				result.should.equal( user );
				done();
			} );
		} );
	} );

	describe( "checkPermission", function() {
		it( "should always resolve to `true`", function() {
			return provider.checkPermission().should.eventually.equal( true );
		} );
	} );

	describe( "hasUsers", function() {
		it( "should always resolve to `true`", function() {
			return provider.hasUsers().should.eventually.equal( true );
		} );
	} );

	describe( "updateActions", function() {
		it( "should always resolve to `true`", function() {
			return provider.updateActions().should.eventually.equal( true );
		} );
	} );

	describe( "getActionRoles", function() {
		it( "should always resolve to an empty array", function() {
			return provider.getActionRoles().should.eql( [] );
		} );
	} );

	describe( "initPassport", function() {
		var auth = function() {};
		var mockPassport = {
			authenticate: sinon.stub().resolves( auth )
		};

		it( "should call passport.authenticate correctly", function() {
			provider.initPassport( mockPassport );
			mockPassport.authenticate.should.have.been.calledOnce;
			mockPassport.authenticate.should.have.been.calledWithExactly( 'github', {
				scope: [ 'user:email', 'read:org' ],
				failureMessage: false,
				failureRedirect: "/auth/login",
				session: true
			} );
		} );
	} );

	describe( "authenticate", function() {
		var githubAuth = sinon.stub();

		before( function() {
			provider.initPassport({
				authenticate: function() {
					return githubAuth;
				}
			});
		} );

		describe( "when hitting a page that requires auth", function() {
			var req = {
				path: "/some/other/path"
			};
			var res = {
				redirect: sinon.stub().returnsThis()
			};
			var next = sinon.stub();

			before( function() {
				githubAuth.reset();
				provider.authenticate( req, res, next );
			} );

			it( "should redirect to the login page", function() {
				res.redirect.should.have.been.calledOnce
					.and.have.been.calledWithExactly( defaultConfig.auth.loginEndpoint );
			} );

			it( "should not have called next", function() {
				next.should.not.have.been.called;
			} );

			it( "should not have called the githubAuth middleware", function() {
				githubAuth.should.not.have.been.called;
			} );
		} );

		describe( "when hitting the login endpoint", function() {
			var req = {
				path: defaultConfig.auth.loginEndpoint
			};
			var res = {
				status: sinon.stub().returnsThis(),
				send: sinon.stub().returnsThis()
			};
			var next = sinon.stub();

			before( function() {
				githubAuth.reset();
				provider.authenticate( req, res, next );
			} );

			it( "should respond with an 500", function() {
				res.status.should.have.been.calledOnce
					.and.calledWithExactly( 500 );
				res.send.should.have.been.calledOnce
					.and.calledWithExactly( "Login endpoint should not be authenticated" );
			} );

			it( "should not have called next", function() {
				next.should.not.have.been.called;
			} );

			it( "should not have called the githubAuth middleware", function() {
				githubAuth.should.not.have.been.called;
			} );
		} );

		describe( "when hitting the auth endpoint", function() {
			var req = {
				path: defaultConfig.auth.authEndpoint
			};
			var res = {};
			var next = sinon.stub();

			before( function() {
				githubAuth.reset();
				provider.authenticate( req, res, next );
			} );

			it( "should forward the call to the githubAuth middleware", function() {
				githubAuth.should.have.been.calledOnce
					.and.calledWithExactly( req, res, next );
			} );
		} );
	} );
} );
