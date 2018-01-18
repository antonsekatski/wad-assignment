mongo

use yoga
db.createUser({ user: 'root', pwd: 'root', roles: ['readWrite'] })