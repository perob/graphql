const express = require('express');
const server = require('express-graphql');
const sqlite = require('sqlite');
const { Schema, buildLoaders } = require('./src/api');

sqlite.open(':memory:', { cached: true })
  .then(() => sqlite.migrate())
  .then(() => {
    const app = express();
    const connection = {
      get: (...args) => sqlite.get(...args),
      all: (...args) => sqlite.all(...args),
      run: (...args) => sqlite.run(...args)
    };
    const loaders = buildLoaders(connection);
    app.use('/', server({
      graphiql: true,
      pretty: true,
      schema: Schema,
      context: { db: connection, data: loaders }
    }));
    app.listen(8080, () => {
      console.log("GraphQL server is now running on http://localhost:8080");
    });
  })
  .catch(e => console.error(e));
