const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const uniqid = require('uniqid')
const fs = require('fs')
const visualize = require('./visualize.js')
const config = require("./config.json")

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var clients = []
const client_id = config.client_id
const client_secret = config.client_secret
const redirect_uri = config.redirect_uri
const this_url = config.this_url
const this_port = config.this_port

const port = process.env.PORT || this_port;

var router = express.Router();
//-------------------------Endpoints-------------------------------------------------------------
app.get('/generate', (req, res, next) => {
	res.send(uniqid().toString())
})

app.get('/login',  (req, res, next) => {
	if(req.query.hash) {
		res.redirect('https://accounts.spotify.com/authorize?' +
			'response_type=code&' +
			'client_id=' + client_id + '&' +
			'scope=user-read-currently-playing&' +
			'redirect_uri=' + redirect_uri + '&' +
			'state=' + req.query.hash.toString()) + '&show_dialog=true'
	}
	else {
		res.send('Invalid Request')
	}
})
app.get('/authorized', (req, res, next) => {
	if(req.query.code) {
		var options = {
			method: 'post',
			form: {
				grant_type: "authorization_code",
				code: req.query.code,
				redirect_uri: redirect_uri
			},
			json: true,
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}
		request(options, function(error, response, body) {
			if(error) {
				return
			}
			let accessToken = body.access_token
			let refreshToken = body.refresh_token
			if(req.query.state) {
				var id = req.query.state
				
				updateClient(id, accessToken, refreshToken)
				res.redirect(this_url + ':' + this_port + '/color?id=' + id)
			}
			return
		})
	}
})

app.get('/color', (req, res, next) => {
	if(req.query.id) {
		console.log('User | ' + req.query.id + ' | is requesting their song information')
		var id = req.query.id
		var token = getClientToken(id)
		if(token) {
			currentlyPlaying(token).then((songID) => {
				songAnalysis(songID,token).then((song) => {
					res.status(200).send(song)
				})
			})
		}
		else {
			res.send('Token missing')
		}
	}
	else {
		res.send('ID invalid')
	}
})
//--------------------------------------Song---Api---Manager-------------------------------------
async function currentlyPlaying(userToken) {
	return new Promise((resolve, reject) => {
		
		var options = {
			url: 'https://api.spotify.com/v1/me/player/currently-playing',
			headers: {
				'Authorization' : 'Bearer ' + userToken,
				'Accept' : 'application/json',
				'Content-Type' : 'application/json'
			}
		}
		request(options, function(error, response, body) {
			if(error) {
				console.log(error)
				reject()
			}
			if(response.statusCode == 200) {
				var content = JSON.parse(body)
				console.log('They are currently listening to ' + content.item.name + '!')
				resolve(content.item.id)
			}
		})
	})
}

async function songAnalysis(songID, userToken) {
	return new Promise((resolve, reject) => {
		var options = {
			url: 'https://api.spotify.com/v1/audio-features/' + songID,
			headers: {
				'Authorization' : 'Bearer ' + userToken,
				'Accept' : 'application/json',
				'Content-Type' : 'application/json'
			}
		}
		request(options, function(error, response, body) {
			if(error) {
				console.log(error)
				reject('Error')
			}
			if(response.statusCode == 200) {
				let content = JSON.parse(body)
				resolve('<html style="background-color:#' + visualize.songToColor(content).toString() + ';">' + body + '</html>')
			}
		})
	})
}
//--------------------------------------Client------Manager--------------------------------------
function updateClient(id, access, refresh) {
	const client = getClient(id)
	if(client) {
		let index = clients.indexOf(client)
		clients[index] = {
			'id':id,
			'access':access,
			'refresh':refresh
		}
	}
	else {
		clients.push({
			'id':id,
			'access':access,
			'refresh':refresh
		})
	}
}

function getClient(id) {
	return clients.find(function(element) {
		return element.id == id
	})
}

function getClientToken(id) {
	const client = getClient(id)
	if(client) {
		return client.access
	}
	else {
		return null
	}
}

function getClientRefresh(id) {
	const client = getClient(id)
	if(client) {
		return client.refresh
	}
	else {
		return null
	}
}
//-----------------------------------------------------------------------------------------------

app.listen(port);
console.log('Aether API is active on port ' + port + '!');