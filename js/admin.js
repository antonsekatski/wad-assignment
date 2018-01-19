import React from 'react'
import ReactDOM from 'react-dom'
import { observable, action, runInAction } from 'mobx'
import { observer } from 'mobx-react'
import { DateTime } from 'luxon'
import DatePicker from 'react-datepicker'
import validator from 'validator'
import moment from 'moment'
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
        weekNumber = now.weekNumber
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

  @action
  async create(data) {
    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    new Noty({
      type: 'success',
      text: 'Created!',
      timeout: 2000,
    }).show()

    await this.fetch()

    return true
  }

  @action
  async setFull(id) {
    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes/full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    })
    
    // this.classes.find(x => x._id === id).is_full = true

    // this.classes.forEach(week => {
    //   week.days.forEach(weekday => {
    //     const elem = weekday.classes.find(x => x._id === id)

    //     if (elem) {
    //       elem.is_full = true
    //     }
    //   })
    // })

    new Noty({
      type: 'success',
      text: 'Now full!',
      timeout: 2000,
    }).show()

    this.fetch()
  }

  @action
  async delete(id) {
    // Get from server
    const resp = await fetch(`${location.protocol}//${location.host}/api/classes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    })

    // this.classes.splice(this.classes.findIndex(x => x._id === id), 1)

    new Noty({
      type: 'success',
      text: 'Removed!',
      timeout: 2000,
    }).show()

    this.fetch()
  }

  // Modals
  @observable modal = null

  openCreate() {
    this.modal = CreateModal
  }

  closeModal() {
    this.modal = null
  }
}

const store = new TimetableStore()

// Main Application
@observer
class App extends React.Component {
  render() {
    return (
      <div>
        <h1 className="title is-1">Admin Dashboard</h1>

        <Classes />

        <Modals />

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

  newClass = (ev) => {
    ev.preventDefault()

    store.openCreate()
  }

  render() {
    if (store.loading) { return <div className="loading">Loading...</div> }

    if (store.classes.length === 0) { return <div className="loading">No classes...</div> }

    return (
      <div>
        <button className="button is-success" onClick={this.newClass}>Add new Class</button>

        <p>&nbsp;</p>

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
              <th>Participants</th>
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

  setFull = (ev) => {
    ev.preventDefault()
    
    store.setFull(this.props.item._id)
  }

  delete = (ev) => {
    ev.preventDefault()
    
    store.delete(this.props.item._id)
  }

  render() {
    const { item } = this.props

    const now = DateTime.fromMillis(item.start_at)
    const start = now.toLocaleString(DateTime.TIME_SIMPLE)
    const end = now.plus({ minutes: item.duration }).toLocaleString(DateTime.TIME_SIMPLE)
    
    return (
      <tr className={`${item.is_full ? 'full-class' : ''}`}>
        <td>{start} - {end}</td>
        <td>{item.style}</td>
        <td>{item.instructor}</td>
        <td>{item.users.length}</td>
        <td className="class-reserve">
          {!item.is_full ? <button className={`button is-success ${store.reserving === item._id ? 'is-loading' : ''}`} onClick={this.setFull}>Set Full</button> : null}
          &nbsp;&nbsp;&nbsp;
          <button className={`button is-danger`} onClick={this.delete}>Delete</button>
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
class CreateModal extends React.Component {
  state = {
    duration: '60',
    style: 'Hatha',
    instructor: 'Elon Musk',
    start_at: moment()
  }

  handleChange = (date) => {
    this.setState({
      start_at: date
    });
  }

  onChange = (name, value) => {
    this.setState({ [name]: value })
  }

  onSubmit = async (ev) => {
    ev.preventDefault()

    if (await store.create(this.state)) {
      store.closeModal()
    }
  }

  render() {
    return (
      <div>
        <h1 className="modal-title">Creat new Class</h1>

        <h1 className="modal-subtitle">Yo, WAD students! Let's do some crazy... stuff!</h1>

        {store.userError ? <div className="notification is-danger">{store.userError}</div> : null}

        <div className="field">
          <label className="label">Time and Date</label>
          <div className="control">
            <DatePicker
                selected={this.state.start_at}
                onChange={this.handleChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="LLL"
                className="input is-medium"
            />
          </div>
        </div>
        
        <div className="field">
          <label className="label">Yoga style</label>
          <div className="control">
            <div className="select full-width">
              <select onChange={(ev) => this.onChange('style', ev.target.value)} className="full-width" value={this.state.style}>
                <option value="Hatha">Hatha</option>
                <option value="Ashtanga">Ashtanga</option>
                <option value="Vinyasa">Vinyasa</option>
              </select>
            </div>
          </div>
        </div>

        <div className="field">
          <label className="label">Duration</label>
          <div className="control">
            <div className="select full-width">
              <select onChange={(ev) => this.onChange('duration', ev.target.value)} className="full-width" value={this.state.duration}>
                <option value="60">60</option>
                <option value="90">90</option>
              </select>
            </div>
          </div>
        </div>

        <div className="field">
          <label className="label">Instructor</label>
          <div className="control">
            <div className="select full-width">
              <select onChange={(ev) => this.onChange('instructor', ev.target.value)} className="full-width" value={this.state.instructor}>
                <option value="Elon Musk">Elon Musk</option>
                <option value="Richard Branson">Richard Branson</option>
                <option value="Warren Buffet">Warren Buffet</option>
              </select>
            </div>
          </div>
        </div>

        <div className="field is-grouped">
          <div className="control">
            <button className={`button is-info is-medium`} onClick={this.onSubmit}>Create</button>
          </div>
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

function createWeekObject(now) {
  return {
    weekStart: DateTime.fromObject({ weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 1 }).toLocaleString(DateTime.DATE_FULL),
    weekEnd: DateTime.fromObject({ weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 7 }).toLocaleString(DateTime.DATE_FULL),
    days: []
  }
}