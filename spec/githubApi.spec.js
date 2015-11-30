require( "./setup" );
var GitHubApi = require( "../src/githubApi" );

describe( "GitHubApi wrapper", function () {
	describe( "validateUserOrg function", function () {
		it( "should return true if the request returns a status of 204", function ( done ) {
			var path = "/orgs/ExampleInc/members/somedeveloperusername";
			nock( "https://api.github.com/" )
				.get( path )
				.reply( 204 );

			GitHubApi.validateUserOrg( "testToken", "somedeveloperusername", "ExampleInc", function ( err, isOrgMember ) {
				should.not.exist( err );
				isOrgMember.should.equal( true );
				done();
			} );
		} );
		it( "should return false if the request returns a status of anything other than 204", function ( done ) {
			var path = "/orgs/ExampleInc/members/somedeveloperusername";
			nock( "https://api.github.com/" )
				.get( path )
				.reply( 404 );

			GitHubApi.validateUserOrg( "testToken", "somedeveloperusername", "ExampleInc", function ( err, isOrgMember ) {
				should.not.exist( err );
				isOrgMember.should.equal( false );
				done();
			} );
		} );
		it( "should set the appropriate headers on the request", function ( done ) {
			var path = "/orgs/ExampleInc/members/somedeveloperusername";
			nock( "https://api.github.com/" )
				.matchHeader( "User-Agent", /^autohost-github-auth\// )
				.matchHeader( "Authorization", "token testToken" )
				.get( path )
				.reply( 204 );

			GitHubApi.validateUserOrg( "testToken", "somedeveloperusername", "ExampleInc", function ( err, isOrgMember ) {
				should.not.exist( err );
				isOrgMember.should.equal( true );
				done();
			} );
		} );
		it( "should respond with an error when the incorrect token is sent with the request", function ( done ) {
			var path = "/orgs/ExampleInc/members/somedeveloperusername";
			nock( "https://api.github.com/" )
				.get( path )
				.reply( 401 );

			GitHubApi.validateUserOrg( "wrongToken", "somedeveloperusername", "ExampleInc", function ( err, isOrgMember ) {
				should.exist( err );
				done();
			} );
		} );
	} );
	describe( "loadUserTeams function", function () {
		var response = require( "./mocks/teams-response" );
		it( "should return an array of teams for the given user", function ( done ) {
			var path = "/user/teams";
			nock( "https://api.github.com" )
				.get( path )
				.reply( 200, response );

			GitHubApi.loadUserTeams( "testToken", function ( err, teams ) {
				should.not.exist( err );
				teams.should.eql( response );
				done();
			} );
		} );
		it( "should set the appropriate headers on the request", function ( done ) {
			var path = "/user/teams";
			nock( "https://api.github.com/" )
				.matchHeader( "User-Agent", /^autohost-github-auth\// )
				.matchHeader( "Authorization", "token testToken" )
				.get( path )
				.reply( 200 );

			GitHubApi.loadUserTeams( "testToken", function ( err, teams ) {
				should.not.exist( err );
				done();
			} );
		} );
		it( "should fail when the incorrect token is sent with the request", function ( done ) {
			var path = "/user/teams";
			nock( "https://api.github.com/" )
				.get( path )
				.reply( 401 );

			GitHubApi.loadUserTeams( "wrongToken", function ( err, body ) {
				err.should.be.an.instanceof( Error );
				done();
			} );
		} );
	} );
} );
