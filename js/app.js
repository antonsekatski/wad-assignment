import React from 'react'
import ReactDOM from 'react-dom'
import { observable, action, runInAction } from 'mobx'
import { observer } from 'mobx-react'
import { DateTime } from 'luxon'
import validator from 'validator'
require('fetch')

let reactKey = 0

// MobX Store class
class TimetableStore {
  @observable classes = []

  @observable loading = false

  // Filter
  @observable instructor = ""
  @observable style = ""

  @action
  async fetch() {
    this.classes = []
    this.loading = true

    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instructor: this.instructor,
        style: this.style
      })
    })

    // Convert to JSON
    const result = await resp.json()

    if (result.length === 0) {
      runInAction(() => {
        this.classes = []
        this.loading = false
      })

      return
    }
    const firstDate = DateTime.fromMillis(result[0].start_at)

    let weekNumber = firstDate.weekNumber
    let final = []
    let week = createWeekObject(firstDate)

    for (let i = 0; i < result.length; i++) {
      const item = result[i]

      const now = DateTime.fromMillis(item.start_at)

      if (weekNumber !== now.weekNumber) {
        week.days = week.days.filter(x => x)

        final.push({...week})

        week = createWeekObject(now)
      }

      if (!week.days[now.weekday]) {
        week.days[now.weekday] = {
          weekLong: now.weekdayLong,
          date: now.toLocaleString(DateTime.DATE_FULL),
          classes: []
        }
      }

      week.days[now.weekday].classes.push(item)
    }

    week.days = week.days.filter(x => x)
    final.push({...week})

    console.log(final)

    // Save it in Store
    runInAction(() => {
      this.classes = final
      this.loading = false
    })
  }

  // Registration
  @observable user = null

  @observable userWorking = false
  @observable userError = null

  @action
  async getUser(data) {
    const item = localStorage.getItem('user')

    if (item) {
      this.user = JSON.parse(item)
    }
  }

  @action
  async signup(data) {
    this.userError = null
    this.userWorking = true

    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    this.userWorking = false

    const json = await resp.json()

    if (resp.status === 422) {
      this.userError = json.error

      new Noty({
        type: 'error',
        text: "Can't sign up",
        timeout: 2000,
      }).show();

      return false
    }

    localStorage.setItem('user', JSON.stringify(json))
    this.user = json.id

    new Noty({
      type: 'success',
      text: 'Signed Up!',
      timeout: 2000,
    }).show();

    return true
  }

  @action
  async login(data) {
    this.userError = null
    this.userWorking = true

    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const json = await resp.json()

    this.userWorking = false

    if (resp.status === 422) {
      this.userError = json.error

      new Noty({
        type: 'error',
        text: "Can't login",
        timeout: 2000,
      }).show();

      return false
    }

    localStorage.setItem('user', JSON.stringify(json))
    this.user = json

    new Noty({
      type: 'success',
      text: 'Logged In!',
      timeout: 2000,
    }).show();

    return true
  }

  @action
  async logout(data) {
    localStorage.removeItem('user')
    this.user = null
  }

  // Reservation
  @observable reserving = null

  @action
  async reserve(classId) {
    this.reserving = classId

    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: store.user.id, 
        class_id: classId 
      })
    })

    this.reserving = null

    const json = await resp.json()

    if (resp.status === 422) {
      new Noty({
        type: 'error',
        text: "Can't reserve",
        timeout: 2000,
      }).show();

      return false
    }

    new Noty({
      type: 'success',
      text: 'Reserved!',
      timeout: 2000,
    }).show()

    this.classes.forEach(x => {
      x.days.forEach(d => {
        d.classes.forEach(c => {
          if (c._id === classId) {
            c.users.push(store.user.id)
          }
        })
      })
    })
  }

  @action
  async cancelReservation(classId) {
    this.reserving = classId

    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: store.user.id, 
        class_id: classId 
      })
    })

    this.reserving = null

    const json = await resp.json()

    if (resp.status === 422) {
      new Noty({
        type: 'error',
        text: "Can't cancel a reservation",
        timeout: 2000,
      }).show();

      return false
    }

    new Noty({
      type: 'success',
      text: 'Reservation cancelled!',
      timeout: 2000,
    }).show()

    this.classes.forEach(x => {
      x.days.forEach(d => {
        d.classes.forEach(c => {
          if (c._id === classId) {
            const index = c.users.indexOf(store.user.id)

            c.users.splice(index, 1)
          }
        })
      })
    })
  }

  // Modals
  @observable modal = null

  openLoginModal() {
    this.modal = LoginSignUpModal
  }

  closeModal() {
    this.modal = null
  }
}

const store = new TimetableStore()

// Main Application
@observer
class App extends React.Component {
  componentDidMount() {
    store.getUser()
  }

  logout = (ev) => {
    ev.preventDefault()

    store.logout()
  }

  render() {
    return (
      <div>
        <h1 className="title is-1">Lesson Schedule
        &nbsp;&nbsp;
        {store.user ? <span className="tag is-info">{store.user.email}</span> : null}
        &nbsp;&nbsp;
        {store.user ? <span className="tag is-danger logout" onClick={this.logout}>Log Out</span> : null}
        </h1>

        <Filters />

        <Classes />

        <Modals />

      </div>
    )
  }
}

// Filters component
@observer
class Filters extends React.Component {
  onChange = (name, value) => {
    store[name] = value
    store.fetch()
  }

  render() {
    return (
      <div className="columns">

        <div className="column is-2">
          <div className="field">
            <label className="label">Yoga style</label>
            <div className="control">
              <div className="select">
                <select onChange={(ev) => this.onChange('style', ev.target.value)}>
                  <option value="">All styles</option>
                  <option value="Hatha">Hatha</option>
                  <option value="Ashtanga">Ashtanga</option>
                  <option value="Vinyasa">Vinyasa</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="column">
          <div className="field">
            <label className="label">Instructor</label>
            <div className="control">
              <div className="select">
                <select onChange={(ev) => this.onChange('instructor', ev.target.value)}>
                  <option value="">All instructors</option>
                  <option value="Elon Musk">Elon Musk</option>
                  <option value="Richard Branson">Richard Branson</option>
                  <option value="Warren Buffet">Warren Buffet</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }
}

// Filters component
@observer
class Classes extends React.Component {
  componentDidMount() {
    store.fetch()
  }

  render() {
    if (store.loading) { return <div className="loading">Loading...</div> }

    if (store.classes.length === 0) { return <div className="loading">No classes...</div> }

    return (
      <div>
        {store.classes.map(x => <Week key={reactKey++} week={x} />)}
      </div>
    )
  }
}

// Filters component
class Week extends React.Component {
  render() {
    const { week } = this.props

    return (
      <div>
        <div className="class-week-line">
          <h3 className="title is-3 has-bold-text">{week.weekStart} - {week.weekEnd}</h3>
        </div>
        {week.days.map(x => <Weekday key={reactKey++} day={x} />)}
      </div>
    )
  }
}

// Filters component
class Weekday extends React.Component {
  render() {
    const { day } = this.props
    
    return (
      <div className="">
        <h4 className="title is-4">{day.weekLong} ({day.date})</h4>
        <table className="table table is-striped is-fullwidth">
          <thead>
            <tr>
              <th className="class-time">Time</th>
              <th className="class-style">Yoga Style</th>
              <th>Instructor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {day.classes.map(x => <Class key={reactKey++} item={x} />)}
          </tbody>
        </table>
      </div>
    )
  }
}

// Filters component
@observer
class Class extends React.Component {
  openModal = (ev) => {
    ev.preventDefault()

    store.openLoginModal()
  }

  reserve = (ev) => {
    ev.preventDefault()

    store.reserve(this.props.item._id)
  }

  cancel = (ev) => {
    ev.preventDefault()
    
    store.cancelReservation(this.props.item._id)
  }

  render() {
    const { item } = this.props

    const now = DateTime.fromMillis(item.start_at)
    const start = now.toLocaleString(DateTime.TIME_SIMPLE)
    const end = now.plus({ minutes: item.duration }).toLocaleString(DateTime.TIME_SIMPLE)

    let buttonComponent = null

    if (store.user) {
      if (item.users.indexOf(store.user.id) > -1) {
        buttonComponent = (
          <button className={`button is-warning ${store.reserving === item._id ? 'is-loading' : ''}`} onClick={this.cancel}>Reserved!</button>
        )
      } else {
        if (item.is_full) {
          buttonComponent = (
            <button className={`button is-danger`}>Class is full</button>
          )
        } else {
          buttonComponent = (
            <button className={`button is-success ${store.reserving === item._id ? 'is-loading' : ''}`} onClick={this.reserve}>Reserve</button>
          )
        }
        
      }
    } else {
      buttonComponent = (
        <button className="button is-success" onClick={this.openModal}>Login to Reserve</button>
      )
    }
    
    return (
      <tr className={`${item.is_full ? 'full-class' : ''}`}>
        <td>{start} - {end}</td>
        <td>{item.style}</td>
        <td>{item.instructor}</td>
        <td className="class-reserve">
          {buttonComponent}
        </td>
      </tr>
    )
  }
}

@observer
class Modals extends React.Component {
  close = (ev) => {
    ev.preventDefault()

    store.closeModal()
  }

  render() {
    if (!store.modal) {
      return null;
    }

    return (
      <div>
        <div className="local-modal-overlay" />
        <div className="local-modal-wrapper">
          
          <div className="local-modal">
          <button className="local-modal-close" onClick={this.close}>×</button>
          {React.createElement(store.modal)}</div>
        </div>
      </div>
    );
  }
}

@observer
class LoginSignUpModal extends React.Component {
  state = {
    showLogin: true
  }

  switch = (ev) => {
    ev.preventDefault()

    this.setState({ showLogin: !this.state.showLogin })
  }

  render() {
    return (
      <div>
        {this.state.showLogin ? <Login switch={this.switch} /> : <SignUp switch={this.switch} />}
      </div>
    )
  }
}

@observer
class Login extends React.Component {
  state = {
    email: '',
    password: ''
  }

  componentDidMount() {
    store.userError = null
  }

  changePassword = (ev) => {
    this.setState({ password: ev.target.value })
  }

  changeEmail = (ev) => {
    this.setState({ email: ev.target.value })
  }

  onSubmit = async (ev) => {
    ev.preventDefault()

    if (await store.login(this.state)) {
      store.closeModal()
    }
  }

  render() {
    return (
      <div>
        <h1 className="modal-title">Sign In</h1>

        <h1 className="modal-subtitle">Hello!</h1>

        {store.userError ? <div className="notification is-danger">{store.userError}</div> : null}
        
        <div className="field">
          <label className="label">Email</label>
          <div className="control">
            <input className="input is-medium" type="text" placeholder="bruce@batman.org" value={this.state.email} onChange={this.changeEmail}/>
            
            {/* {store.account.errors.name ? <p className="help is-danger">{store.account.errors.name}</p> : null} */}
          </div>
        </div>

        <div className="field">
          <label className="label">Password</label>
          <div className="control">
            <input className="input is-medium" type="password" placeholder="Password" value={this.state.password} onChange={this.changePassword} />
          </div>
        </div>

        <div className="field is-grouped">
          <div className="control">
            <button className={`button is-info is-medium ${store.userWorking ? ' is-loading' : ''}`} onClick={this.onSubmit}>Sign In</button>
          </div>
        </div>

        <div className="field">
          <a href="#" onClick={this.props.switch}>Create an account</a>
        </div>
      </div>
    );
  }
}

@observer
class SignUp extends React.Component {
  state = {
    email: '',
    password: '',
    errors: {}
  }

  componentDidMount() {
    store.userError = null
  }

  changePassword = (ev) => {
    this.setState({ password: ev.target.value }, this.validate)
  }

  changeEmail = (ev) => {
    this.setState({ email: ev.target.value }, this.validate)
  }
  
  validate = () => {
    const errors = {}

    if (validator.isEmpty(this.state.email)) {
      errors.email = "Can't be empty"
    } else if (!validator.isEmail(this.state.email)) {
      errors.email = "Not an email"
    }

    if (validator.isEmpty(this.state.password)) {
      errors.password = "Can't be empty"
    } else if (this.state.password.length < 3) {
      errors.password = "Should be more than 3 characters"
    }

    this.setState({ errors })
  }

  onSubmit = async (ev) => {
    ev.preventDefault()

    if (await store.signup(this.state)) {
      store.closeModal()
    }
  }

  render() {
    return (
      <div>
        <h1 className="modal-title">Sign Up</h1>

        <h1 className="modal-subtitle">Let's create an account, shall we?</h1>

        {store.userError ? <div className="notification is-danger">{store.userError}</div> : null}
        
        <div className="field">
          <label className="label">Email</label>
          <div className="control">
            <input className="input is-medium" type="text" placeholder="bruce@batman.org" value={this.state.email} onChange={this.changeEmail}/>
            
            {this.state.errors.email ? <p className="help is-danger">{this.state.errors.email}</p> : null}
          </div>
        </div>

        <div className="field">
          <label className="label">Password</label>
          <div className="control">
            <input className="input is-medium" type="password" placeholder="Password" value={this.state.password} onChange={this.changePassword} />
          </div>
          {this.state.errors.password ? <p className="help is-danger">{this.state.errors.password}</p> : null}
        </div>

        <div className="field is-grouped">
          <div className="control">
            <button className={`button is-info is-medium ${store.userWorking ? ' is-loading' : ''}`} onClick={this.onSubmit}>Sign Up</button>
          </div>
        </div>

        <div className="field">
          <a href="#" onClick={this.props.switch}>Login</a>
        </div>
      </div>
    );
  }
}

// Render React application to an HTML component
ReactDOM.render(
  <App />,
  document.getElementById('timetable')
)

function createWeekObject(now) {
  return {
    weekStart: DateTime.fromObject({ weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 1 }).toLocaleString(DateTime.DATE_FULL),
    weekEnd: DateTime.fromObject({ weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 7 }).toLocaleString(DateTime.DATE_FULL),
    days: []
  }
}