'use strict';

// Load Environment Vairables from the .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const superagent =  require('superagent');

//Application Setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

app.get('/location', (request, response) => {
  try {
    let locationData = request.query.data;
    let latLong = convertLatLong(locationData);
    response.send(latLong);
  } catch(e) {
    let message = handleErrors(e);
    response.status(message.status).send(message.responseText);
  }
});

//---------------Constructor Functions----------------------//
function convertLatLong(query){
  let geoData = require('./data/geo.json');
  // let geoData = url('https://maps.googleapis.com/maps/api/geocode/outputFormat?parameters');
  let location = {
    search_query: query,
    formatted_query: geoData.results[0].formatted_address,
    latitude: geoData.results[0].geometry.location.lat,
    longitude: geoData.results[0].geometry.location.lng,
  };
  return location;
}


app.get('/weather', (request, response) =>{
  try {
    let darksky = require('./data/darksky.json');
    let result = [];

    darksky.daily.data.forEach(object => {
      let date = new Date(object.time * 1000).toString().slice(0,15);
      let forecast = object.summary;
      let info = getWeather(forecast, date);
      result.push(info);
    });
    response.send(result);
  } catch(e) {
    let message = handleErrors(e);
    response.status(message.status).send(message.responseText);
  }
});

function getWeather(forecast, time){
  let weatherInfo = {
    forecast: forecast,
    time: time
  };

  return weatherInfo;
}

//--------------Handle Errors-------------------//
function handleErrors() {
  let errObj = {
    status: 500,
    responseText: 'Sorry something went wrong',
  };
  return errObj;
}
//-------------------API Routes-------------------//
// put stuff here 


//Make sure the server is listening for requests
//entry point

app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
