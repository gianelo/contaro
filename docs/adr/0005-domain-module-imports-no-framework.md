# The domain module may not import the framework

Every rule in this product — what a Movement counts against, how pace is computed, who may see a Space — lives in one domain module, and almost all tests drive it directly. That only stays true while the module has no framework in it: the moment it imports the database, a React component or a Next primitive, its tests need a running application and the fast seam is gone.

We enforce this with a lint boundary rather than a convention: the domain directory may not import `next`, `react`, the database client, or anything else outside itself and the standard library. Everything the domain needs from the outside arrives as an argument.

## Consequences

Writing a feature sometimes means passing data into the domain that a route handler could have fetched inline, which reads as indirection until you try to test it. Expect to hit the lint error and want to delete the rule; that is the rule working. The seam it protects is why a rule about parent-category budgets can be tested in a millisecond, without a database, a session or a browser.
