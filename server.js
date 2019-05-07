'use strict';

// ----------------------------*
// Load Environment Vairables from the .env file
// ----------------------------*

require('dotenv').config();

// ----------------------------*
// Application Dependencies
// ----------------------------*

const express = require('express');
const cors = require('cors');
const superagent =  require('superagent');
const pg = require('pg');

// ----------------------------*
// Application SetUp
// ----------------------------*
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

// ----------------------------*
// Database Config
// ----------------------------*
// 1. Create a client with connection url
const client = new pg.Client(process.env.PG_CONNECTION_URL);

//  2.  Connect client
client.connect();

// 3. Add event listenters
client.on('err', err => console.error(err));

// ----------------------------*
// Errors
// ----------------------------*
let handleErrors = (err, response) => {
  console.error(err); // Might as well be a DB save ...
  if(response) response.status(500).send('Internal Server Error Encountered');
};

// ----------------------------*
// Constructor Functions
// ----------------------------*
function Location(query, data){
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

//Static function
// All API calls will be either a static function or attached as a prototype

Location.fetchLocation = (query) => {
  const url = `https://maps.googeapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent.get(url)
    .then(result => {
      if(!result.body.results.length) throw 'No data';
      let location = new Location(query, result.body.results[0]);
      return location.save()
        .then(result => {
          location.id = result.rows[0].id;
          return location;
        });
    });
};

Location.lookup = handler => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [handler.query];

  return client.query(SQL, values)
    .then(results => {
      if(results.rowcount > 0) {
        handler.cacheHit(results);
      }else{
        handler.cacheMiss(results);
      }
    })
    .catch(console.error);
};

//Use prepared statements to prevent SQL insertion!

Location.prototype.save = function() {
  let SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude)
  VALUES ($1, $2, $3, $4)
  RETURNING id;`;

  let values = Object.values(this);

  return client.query(SQL, values);
};



// ----------------------------*
// Weather
// ----------------------------*

function Weather(day){
  this.forecast = day.summary;
  this.time = new Date(day.time *1000).toString().slice(0, 15);
}

// ----------------------------*
// Route Callbacks
// ----------------------------*

let getLocation = (request, response) => {

  const locationHandler = {
    query: request.query.data,
    cacheHit: results => {
      console.log('Got data from DB');
      response.send(results[0]);
    },
    casheMiss:  () => {
      Location.fetchLocation(request.query.data)
        .then(results => response.send(results));
    }
  };

  Location.lookup(locationHandler);
};

let getWeather = (request, response) => {
  const data = request.query.data;
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${data.latitude},${data.longitude}`;

  return superagent.get(url)
    .then(result => {
      //get forecast - refer to comments in API section below
      //get time
      const weatherSummaries = result.body.daily.data.map(day => {
        return new Weather(day);
      });

      response.send(weatherSummaries);
    })
    .catch(error => handleErrors(error, response));
};

// ----------------------------*
// Routes (API)
// ----------------------------*
app.get(`/location`, getLocation);
app.get('/weather', getWeather);

// app.get('/weather', (request, response) =>{
//   try {
//     let darksky = require('./data/darksky.json');
//     let result = [];

//     darksky.daily.data.forEach(object => {
//       let date = new Date(object.time * 1000).toString().slice(0,15);
//       let forecast = object.summary;
//       let info = getWeather(forecast, date);
//       result.push(info);
//     });
//     response.send(result);
//   } catch(e) {
//     let message = handleErrors(e);
//     response.status(message.status).send(message.responseText);
//   }
// });

// ----------------------------*
// PowerOn
// ----------------------------*
//Make sure the server is listening for requests - entry point
//Console.log message is super helpful
app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
