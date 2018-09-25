const convert = require('color-convert')

//Values range from 0-255
const maxHue = 180 //Blue
const minHue = 0 //Red
const maxLum = 240
const minLum = 100
const sat = 255

function songToColor(song) {
	//Uses https://api.spotify.com/v1/audio-features/{id} track object
	//https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
	
	//Standard HSL uses (Deg, %, %)
	let h = Math.round(((1-song.energy) * (maxHue - minHue) + minHue) * 1.4117) //From 0-255 to 0-360Deg
	let s = Math.round(sat * 0.39215)											//From 0-255 to 0-100%
	let l = Math.round((song.valence * (maxLum - minLum) + minLum) * 0.39215)   //From 0-255 to 0-100%
	
	let rgb = convert.hsl.rgb(h,s,l)
	return convert.rgb.hex(rgb)
}

module.exports = {
	songToColor: songToColor
}