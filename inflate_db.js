const MongoClient = require('mongodb').MongoClient
const { DateTime } = require('luxon')

// Connection URL
const url = 'mongodb://root:root@localhost:27017/yoga'

// Use connect method to connect to the server
MongoClient.connect(url, async function(err, client) {
  if (err) {
    console.log(err)
    return
  }

  db = client.db('yoga')

  try {  
    db.createCollection('users')
    db.createCollection('classes')
  } catch (error) {
    
  }

  await db.collection('classes').remove({})

  // Populate courses
  const a = [
    {
      style: 'Hatha',
      instructor: 'Elon Musk',
      duration: 60,
      is_full: false,
      users: [],
      start_at: DateTime.fromISO("2018-01-12T09:45").valueOf() 
    },
    {
      style: 'Vinyasa',
      instructor: 'Elon Musk',
      duration: 90,
      is_full: true,
      users: [],
      start_at: DateTime.fromISO("2018-01-13T09:45").valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Richard Branson',
      duration: 60,
      is_full: false,
      users: [],
      start_at: DateTime.fromISO("2018-01-13T11:45").valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Richard Branson',
      duration: 90,
      is_full: false,
      users: [],
      start_at: DateTime.fromISO("2018-01-13T15:00").valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Warren Buffet',
      duration: 90,
      is_full: false,
      users: [],
      start_at: DateTime.fromISO("2018-01-14T09:45").valueOf() 
    },
    {
      style: 'Vinyasa',
      instructor: 'Warren Buffet',
      duration: 60,
      is_full: false,
      users: [],
      start_at: DateTime.fromISO("2018-01-15T09:45").valueOf() 
    }
  ]
  a.forEach(x => {
    db.collection('classes').insert(x)
  })

  console.log('Done')
})