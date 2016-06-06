'use strict';

var expect = require('chai').expect;
var API = require(__dirname +'/../app');
var spyOn = require(__dirname + '/helper/spy');

describe('Public API', function () {
  var api;
  beforeEach(function () {
    api = new API();
  });
  afterEach(function () {
    api = null;
  });
  
  describe('Users', function () {
    describe('api.addUser()', function () {
      it('Sets instance.clique to instance.id', function () {
        var instance = api.addUser({name: 'Luke'});
        expect(instance.clique).to.equal(instance.id);
      });

      it('Creates a Clique.instance with count 1', function () {
        var expectedClique = api.model.Cliques.selectOne();
        expect(expectedClique).to.equal(null);
        
        var instance = api.addUser({name: 'Luke'});
        
        expectedClique = api.model.Cliques.selectOne({root: instance.id});
        expect(expectedClique.count).to.equal(1);
      });
    });

    describe('UserInstance.getEdges()', function () {
      it('Returns an Array of connected User Instances', function () {
        var pa = api.addUser({name: 'Walt'});
        var ma = api.addUser({name: 'June'});
        api.addEdge(pa.id, ma.id);

        expect(pa.getEdges()[0]).to.equal(ma);
      });
    });
  });

  describe('Edges', function () {
    var ma, pa, wally, beav;
    beforeEach(function () {
      ma = api.addUser({name: 'ma'});
      pa = api.addUser({name: 'pa'});
      wally = api.addUser({name: 'wally'});
      beav = api.addUser({name: 'beav'});      
    });

    describe('api.addEdge(tutorId, tuteeId)', function () {
      it('Combines the nodes\' cliques, if different', function () {
        expect(ma.clique).not.to.equal(pa.clique);        
        api.addEdge(ma.id, pa.id);
        expect(ma.clique).to.equal(pa.clique);
      });

      it('New clique count is sum of both cliques', function () {
        var maClique = api.model.Cliques.selectOne({root: ma.clique});
        var paClique = api.model.Cliques.selectOne({root: pa.clique});
        expect(maClique.count).to.equal(1);
        
        api.addEdge(ma.id, pa.id);
        
        expect(maClique.count).to.equal(2);
      });

      it('Removes the subsumed clique instance', function () {
        var paClique = api.model.Cliques.selectOne({root: pa.clique});
        var root = paClique.root;
        expect(paClique.count).to.equal(1);
        
        api.addEdge(ma.id, pa.id);
                
        expect(api.model.Cliques.selectOne({root: root})).to.equal(null);
      });

      it('Combines cliques transitively', function () {
        expect(wally.clique).not.to.equal(ma.clique);

        api.addEdge(ma.id, pa.id);
        api.addEdge(ma.id, wally.id);
        
        expect(wally.clique).to.equal(pa.clique);
      });

      it('Sums the clique counts transitively', function () {
        var maClique = api.model.Cliques.selectOne({root: ma.clique});
        var paClique = api.model.Cliques.selectOne({root: pa.clique});
        var wallyClique = api.model.Cliques.selectOne({root: wally.clique});        
        expect(maClique.count).to.equal(1);
        expect(paClique.count).to.equal(1);
        expect(wallyClique.count).to.equal(1);
        
        api.addEdge(ma.id, pa.id);
        api.addEdge(ma.id, wally.id);

        expect(maClique.count).to.equal(3);
      });

      it('Removes subsumed cliques transitively', function () {
        var paRoot = pa.clique
        var wallyRoot = wally.clique;
        
        api.addEdge(ma.id, pa.id);
        api.addEdge(ma.id, wally.id);

        
        expect(api.model.Cliques.selectOne({root: paRoot})).to.equal(null);
        expect(api.model.Cliques.selectOne({root: wallyRoot})).to.equal(null);
      });
    });

    describe('api.cutEdge(edgeId)', function () {
      beforeEach(function () {
        api.addEdge(ma.id, pa.id);
        api.addEdge(ma.id, wally.id);        
      });
      
      it('Removes edge from model', function () {
        api.cutEdge(1);
        expect(api.model.Edges.selectOne({id: 1})).to.equal(null);
      });

      it('Splits clique if edge is an articulation edge', function () {
        expect(wally.clique).to.equal(pa.clique);
        expect(wally.clique).to.equal(1);
        
        api.cutEdge(2);
        
        expect(wally.clique).not.to.equal(pa.clique);
      });

      it('Splits clique transitively', function () {
        api.addEdge(wally.id, beav.id);
        // All users in one clique. Edges:
        // ma -> pa
        // wally -> ma
        // wally -> beav
        
        expect(beav.clique).to.equal(pa.clique);
        expect(beav.clique).to.equal(1);
        
        api.cutEdge(2); // (ma -> wally)
        
        expect(wally.clique).not.to.equal(pa.clique);
        expect(beav.clique).not.to.equal(pa.clique);
        
        expect(wally.clique).to.equal(beav.clique); // wally -> beav
        expect(ma.clique).to.equal(pa.clique);      // ma -> pa
      });

      it('Does not split clique if edge is not an articulation edge',
         function () {
           expect(wally.clique).to.equal(pa.clique);
           expect(wally.clique).to.equal(1);
           api.addEdge(wally.id, pa.id);
           
           api.cutEdge(2);
           
           expect(wally.clique).to.equal(pa.clique);
         });

      it('Updates split clique counts transitively', function () {
        api.addEdge(wally.id, beav.id);        
        var family = api.model.Cliques.selectOne({root: ma.clique});
        expect(family.count).to.equal(4);
        
        api.cutEdge(2); // (ma -> wally)

        var parents = api.model.Cliques.selectOne({root: ma.clique});
        var kids = api.model.Cliques.selectOne({root: wally.clique});

        expect(parents.count).to.equal(2);
        expect(kids.count).to.equal(2);
      });
    });
  });

  describe('Cliques', function () {
    var ma, pa, wally, beav;
    var parents, kids;
    beforeEach(function () {
      ma = api.addUser({name: 'ma'});
      pa = api.addUser({name: 'pa'});
      api.addEdge(ma.id, pa.id);
      parents = api.model.Cliques.selectOne({root: ma.clique});
      
      wally = api.addUser({name: 'wally'});
      beav = api.addUser({name: 'beav'});
      api.addEdge(wally.id, beav.id);
      kids = api.model.Cliques.selectOne({root: wally.clique});
    });

    describe('select(whereClause)', function () {
      it('Returns an Array of Clique instances', function () {
        var cliques = api.model.Cliques.select();
        expect(cliques).to.be.an('array');        
      });

      it('Maps whereClause to filter instances', function () {
        var cliques = api.model.Cliques.select({root: pa.clique});
        expect(cliques.length).to.equal(1);
      });
    });
  });

  describe('totalInfection(UserInstance, versionNumber)', function () {
    var ma, pa, wally, beav;
    var spy, stash;
    beforeEach(function () {
      ma = api.addUser({name: 'ma'});
      pa = api.addUser({name: 'pa'});
      api.addEdge(ma.id, pa.id);
      
      wally = api.addUser({name: 'wally'});
      beav = api.addUser({name: 'beav'});
      api.addEdge(wally.id, beav.id);
      
      spy = spyOn(api.model.Users, 'update');
    });
    afterEach(function () {
      spy.reset();      
    });

    it('Simply calls UserModel.update for the matching clique', function () {
      expect(spy.count).to.equal(0);
      api.totalInfection(ma, '1.0');
      expect(spy.count).to.equal(1);
    });
  });

  describe('limitedInfection(minSize, maxSize, versionNumber', function () {
    
  }); 
});
