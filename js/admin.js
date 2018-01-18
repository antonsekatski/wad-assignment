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

    // Save it in Store
    runInAction(() => {
      this.classes = result
      this.loading = false
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
  document.getElementById('admin')
)