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

  const now = DateTime.local()

  // Populate courses
  const a = [
    {
      style: 'Hatha',
      instructor: 'Elon Musk',
      duration: 60,
      is_full: false,
      users: [],
      start_at: now.plus({ days: 1 }).set({ hour: 9, minute: 45 }).valueOf() 
    },
    {
      style: 'Vinyasa',
      instructor: 'Elon Musk',
      duration: 90,
      is_full: true,
      users: [],
      start_at: now.plus({ day: 1 }).set({ hour: 10, minute: 30 }).valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Richard Branson',
      duration: 60,
      is_full: false,
      users: [],
      start_at: now.plus({ day: 1 }).set({ hour: 11, minute: 45 }).valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Richard Branson',
      duration: 90,
      is_full: false,
      users: [],
      start_at: now.plus({ day: 2 }).set({ hour: 15, minute: 0 }).valueOf() 
    },
    {
      style: 'Ashtanga',
      instructor: 'Warren Buffet',
      duration: 90,
      is_full: false,
      users: [],
      start_at: now.plus({ day: 2 }).set({ hour: 9, minute: 45 }).valueOf() 
    },
    {
      style: 'Vinyasa',
      instructor: 'Warren Buffet',
      duration: 60,
      is_full: false,
      users: [],
      start_at: now.plus({ day: 3 }).set({ hour: 9, minute: 45 }).valueOf() 
    }
  ]
  a.forEach(x => {
    db.collection('classes').insert(x)
  })

  console.log('Done')
})