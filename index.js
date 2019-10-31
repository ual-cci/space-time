require('dotenv').config()
const moment = require('moment')
const ical = require('ical');
const express = require('express')
const http = require('http')

const courseRegex = /^Group: ([A-z0-9_/ \(\);]+)/

const displays = require('./displays.json')

const app = express()
const server = http.Server(app)

app.use(express.static('./static'))
app.use('/jquery', express.static('./node_modules/jquery/dist'))
app.use('/moment', express.static('./node_modules/moment'))

// Use PUG to render pages
app.set('views', './views')
app.set('view engine', 'pug')
app.set('view cache', false)

// Start server
const listener = server.listen(process.env.APP_PORT ,process.env.APP_HOST, function () {
	console.log(`Server started`)
})

app.get('/', (req, res) => {
	res.render('index');
})

app.get('/single', (req, res) => {
	res.render('list', {
		path: 'single',
		displays: displays.single
	});
})

app.get('/multi', (req, res) => {
	res.render('list', {
		path: 'multi',
		displays: displays.multi
	});
})

app.get('/single/:slug', (req, res) => {
	var now = moment()
	var display = displays.single.filter((display)=> {
		return display.slug == req.params.slug
	})[0]

	if (!display) res.send(404)

	ical.fromURL(display.url, {}, function (err, data) {
		var events = []
		for (let k in data) {
			if (data.hasOwnProperty(k)) {
				var ev = data[k];
				if (data[k].type == 'VEVENT') {
					const start = moment(ev.start)
					const end = moment(ev.end)
					if (end.isAfter(now) && start.isSame(now,'day')) {
						events.push({
							title: ev.summary.split(';')[0],
							course: extractCourseData(ev.description),
							start: ev.start,
							end: ev.end
						})
					}
				}
			}
		}
		console.log(events);
		events.sort((a, b) => {
			a = moment(a.start)
			b = moment(b.start)
			return a.isAfter(b) ? 1 : -1;
		})
		var opts = {
			moment: moment,
			room: {
				number: display.number,
				name: display.name,
				brand: display.brand,
				bookable: display.bookable
			},
			display: {
				ip: req.ip,
				slug: display.slug
			}
		}

		opts.events = events;

		res.render(display.mode, opts)
	});
})

app.get('/multi/:slug', (req, res) => {
	var now = moment()
	var display = displays.multi.filter((display) => {
		return display.slug == req.params.slug
	})[0]

	if (!display) res.send(404)

	var promises = []
	var room_details = displays.single.filter((room) => {
		return display.rooms.indexOf(room.slug) != -1
	})
	room_details.forEach((room) => {
		promises.push(fetchCalendar(room.url))
	})

	Promise.all(promises).then((room_events) => {
		var rooms = []
		room_details.forEach((rd, i) => {
			var room = {
				name: rd.name,
				number: rd.number,

			}
			room.events = room_events[i]
			room.events.sort((a, b) => {
				a = moment(a.start)
				b = moment(b.start)
				return a.isAfter(b) ? 1 : -1
			})
			rooms.push(room)
		})

		var opts = {
			moment: moment,
			display: {
				name: display.name,
				brand: display.brand
			}
		}
		opts.rooms = rooms;
		res.render('multi', opts)
	})
})

function extractCourseData(str) {
	var courses = str.match(courseRegex)
	if (courses) {
		courses = courses[1].split(';')
		courses = courses.map((c) => {
			c = c.replace('LCC_', '')
			c = c.replace('CAM_', '')
			c = c.replace('CCI_', '')
			c = c.replace('FT Yr', 'Year')
			c = c.replace('PT Yr', 'Year')
			return c.trim()
		})
		return courses
	} else {
		return []
	}
}

function fetchCalendar(url, now) {
	if (!now) now = moment()
	return new Promise((resolve, reject) => {
		ical.fromURL(url, {}, (err, data) => {
			if (err) return reject(err)
			var events = []
			for (let k in data) {
				if (data.hasOwnProperty(k)) {
					var ev = data[k];
					if (data[k].type == 'VEVENT') {
						const start = moment(ev.start)
						const end = moment(ev.end)
						if (end.isAfter(now) && start.isSame(now,'day')) {
							events.push({
								title: ev.summary.split(';')[0],
								course: extractCourseData(ev.description),
								start: ev.start,
								end: ev.end
							})
						}
					}
				}
			}
			resolve(events);
		})
	})
}
