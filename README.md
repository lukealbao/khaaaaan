# TL;DR
We attempt to overcome the complexity of calculating the subset sum,
as well as minimizing memory usage when processing huge numbers of
users, by addressing the data model: we track connected components of
the user graph as edges are created and removed. Assuming an even
distribution of components sizes, we rely on the law of large numbers
to quickly pull a random number of components to infect.

As a result, the interesting stuff is in the edge creation and
deletion. If you want to see bredth-first search implementation, you
can see the `userBfs` or `hasPath` private functions. Most everything else
is going to be the result of me getting a little carried away trying
to write something that could be used like an ORM in order to mimic a
little bit of structure.

The functional tests of edge operations can be run with `npm
test`. You will need to also run `npm install` to install mocha and
chai first. 

I wrote tests (and a mini statistical framework) to run
simulations for the `limitedInfection` procedure. You can run that by
running `npm run limited`. (It will take ~15 seconds to run, most of
which is spent generating random data.) You will see that the two
tests there perform poorly. My hunch is that there's a problem with
the data generation process; upon inspection, I found that the
clique sizes are not normally distributed, which is the fundamental
assumption behind the design. In real life, even a highly skewed
distribution may be managable (given it is big enough) with some
simple modifications to the procedure for calculating the number of
cliques to infect.


# Model
The obvious starting point is to model the users as a graph. The user
graph is composed of disjoint subgraphs. We assume that this will be
implemented with a relational database, so there will be a Users table
to represent the nodes and an Edges table to represent the
edges. Though the Edges do track the direction of the relationship,
for the purposes of this exercise, let's pretend the Edges graph
indexes each column (`tutor` and `tutee`), so that getting the
connections for a given user is easy and fast.

Given this model, designing a `total_infection` procedure is pretty
straightforward: simply do a breadth-first search from a given user to
find the component subgraph that they belong to, and update the
`version` of all the users returned. The main disadvantage of this is
the lack of granularity. So we want to implement `limited_infection`,
but that gives rise to even larger complications.

## Complications
The `limited_infection` procedure can be reduced to two subproblems -
finding all the connected components in the graph (*O(m\*n)* running
time; *Θ(m/n)* database queries), and finding an optimum subset sum of
the component sizes (exponential running time).

In addition to expenential running time, this strategy needs to load
the entire graph into memory. Doing this for 1 Million users could be
prohibitive.

Lastly, any time an edge is added where two users have differing
versions, you would need to do another *m'/n'* queries to update the
versions of all the connected users.

# Remodeling
In order to mitigate some of these complications, we will add a new
table to our model to track Cliques, which are the connected
components of the graph. The new Cliques table will track a root user,
as well as a count of all the member users. We also add a new `clique`
attribute to the Users model to denote its membership. The reasoning
goes like this:

- If the Users table has an index on the `clique`, an operation for  all
  users in a given clique takes *O(log n)* time and *0(1)* db
  queries.
- Since, by definition, any node in a clique has a path to any other
  node, we can index cliques by any arbitrary member as its "root".
- Adding an edge between two disjoint users creates a union of the
  cliques with a single db query. (Or three, if you want to only
  update the clique for the users of the smaller clique.)
- Cutting an articulation edge is fairly costly, as it requires a
  search through all the nodes in one subclique and updating them with
  a new clique, which is rooted in the node whose edge was just
  cut. (This too can be optimized so that the smaller clique generally
  gets updated.)

## Benefits
With the addition of a Clique primitive to our model, we can run
`total_infection` in a single database query: we simply update the
version for all members of the seed user's clique.

For running the `limited_infection` procedure, the benefits are not as
stark. We completely remove the need for the connected components
search into a *O(1)* operation (relative to db performance), leaving
only the subset sum problem. Unfortunately, it is still exponential in
running time.

However, since we treat cliques as a primitive, we can query the
database about them efficiently.

# Approaches

## `total_infection`
Since the interesting legwork is done ahead of time, when users and
edges are created or deleted, this operation is almost trivial. Given
a User instance, it can be understood with a single SQL query:

`UPDATE USERS (version) VALUES(1.0.0) WHERE clique = 42;`

## `limited_infection`
We can get a list of components, or the sum of all of them in a single
database query. We can likewise get the sum of all users in a single
query. As a result, it's trivial to calculate the average clique size.
