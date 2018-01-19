const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const validator = require('validator')
const bcrypt = require('bcrypt');

const saltRounds = 10;

const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID;

const { DateTime } = require('luxon')

// Connection URL
const url = 'mongodb://root:root@localhost:27017/yoga'

// MongoDB database connection
let db

app.use(express.static('public'))

app.set('view engine', 'ejs')

// parse application/json
app.use(bodyParser.json())

// Server static page
app.get('/', (req, res) => {
  app.render('index', (err, html) => {
    res.send(html)
  });
})

// Server static page
app.get('/admin', (req, res) => {
  app.render('admin', (err, html) => {
    res.send(html)
  });
})

// ======================== //
// API
// ======================== //
app.post('/api/classes', async (req, res) => {
  const now = DateTime.local()

  const params = {}

  if (req.body.instructor) {
    params.instructor = req.body.instructor
  }

  if (req.body.style) {
    params.style = req.body.style
  }

  const result = await db.collection('classes')
  .find({
    start_at: { $gte: now.valueOf() },
    ...params
  })
  .sort({ start_at: 1 })
  .toArray()

  res.send(result)
})

app.post('/api/users/create', async (req, res) => {
  if (await db.collection('users').findOne({ email: req.body.email })) {
    res.status(422).send({ error: "User already exists" })
    return
  }

  let isValid = true

  if (validator.isEmpty(req.body.email)) {
    isValid = false
  } else if (!validator.isEmail(req.body.email)) {
    isValid = false
  } 

  if (validator.isEmpty(req.body.password)) {
    isValid = false
  } else if (req.body.password.length < 3) {
    isValid = false
  }

  if (!isValid) {
    res.status(422).send({ error: "Data is not valid" })
    return
  }

  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(req.body.password, salt);

  const result = await db.collection('users')
  .insert({
    email: req.body.email,
    password: hash
  })

  const user = await db.collection('users').findOne({ email: req.body.email })

  res.send({ id: user._id, email: user.email })
})

app.post('/api/users/login', async (req, res) => {
  const result = await db.collection('users')
  .findOne({
    email: req.body.email
  })

  if (!result) {
    res.status(422).send({ error: "User not found" })
    return
  }

  if (!bcrypt.compareSync(req.body.password, result.password)) {
    res.status(422).send({ error: "Invalid password" })
    return
  }

  res.send({ id: result._id, email: result.email })
})

app.post('/api/classes/reserve', async (req, res) => {
  const result = await db.collection('classes')
  .findOne({
    _id: new ObjectId(req.body.class_id)
  })

  if (!result) {
    res.status(422).send({ error: "Can't find class" })
    return
  }

  if (result.users.indexOf(req.body.user_id) === -1) {
    result.users.push(req.body.user_id)
    await db.collection('classes').save(result)
  }

  res.send({})
})

app.post('/api/classes/cancel', async (req, res) => {
  const result = await db.collection('classes')
  .findOne({
    _id: new ObjectId(req.body.class_id)
  })

  if (!result) {
    res.status(422).send({ error: "Can't find class" })
    return
  }

  const index = result.users.indexOf(req.body.user_id)

  if (index > -1) {
    result.users.splice(index, 1)
    console.log(result)
    await db.collection('classes').save(result)
  }

  res.send({})
})

// Admin
app.delete('/api/classes', async (req, res) => {
  const result = await db.collection('classes')
  .remove({
    _id: new ObjectId(req.body.id)
  })

  res.send({})
})

app.post('/api/classes/full', async (req, res) => {
  const result = await db.collection('classes')
  .update({
    _id: new ObjectId(req.body.id)
  }, {
    $set: {
      is_full: true
    }
  })

  res.send({})
})

app.post('/api/classes/create', async (req, res) => {
  const data = req.body

  data.duration = parseInt(data.duration, 10)

  data.start_at = DateTime.fromISO(data.start_at).toLocal().valueOf()

  data.users = []

  const result = await db.collection('classes')
  .insert(data)

  res.send({})
})

// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {
  if (err) {
    console.log(err)
    return
  }

  app.listen(3000, () => {
    console.log('Server is listening on 127.0.0.1:3000')
  })
 
  db = client.db('yoga')
})
