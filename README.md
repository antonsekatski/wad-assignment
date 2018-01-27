# What to do:

#### Preparing

- Install MongoDB
- Install Node.js

#### MongoDB

Start MongoDB shell and run the following:

```
use yoga
db.createUser({ user: 'root', pwd: 'root', roles: ['readWrite'] })
```

#### Create initial entities for testing

Then go to the folder and run the following to create testing entities in the database:

```
node inflate_db.js
```

#### Run

Go to the folder and run the following to start a server:

```
npm install
npm run start
```

Go to http://localhost:3000/

#### Admin

Go to http://localhost:3000/admin
