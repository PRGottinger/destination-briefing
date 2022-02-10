let country_list = [];
let world_time = null;
let current_weather_request = null;
let weather_attempts = 0;
let isDayTime = null;

const countryNameEl = document.getElementById("country_name");
const countryListEl = document.getElementById("country_list");
const modalEl = document.querySelector(".modal-alert");

// Handles asynchronous fetch requests and then calls the respective method to handle the data once its received 
function network_manager(request) {
    
    const info_request = request.split("?")[0].trim();
    const parameter = request.split("?")[1];
    
    let apiUrl = null;
    let base = null;

    // Sets the apiUrl depending on which data is being fetched
    switch(info_request){
      
        case "countries":
            // This address is for an array of all the available countries, their full names, country codes amd briefing URL from TravelBriefing's API
            
            apiUrl = "https://travelbriefing.org/countries?format=json";
            break;

        case "country-briefing":
            // This address is for an object of the breifing data from TravelBriefing's API for the country that was passed in with the request
            
            apiUrl = parameter + "?format=json";
            break;

        case "weather":
            // This address is for an object to retrieve the current weather for the lat/long
            // Example format: https://fcc-weather-api.glitch.me/api/current?lat=25.9&lon=50.6
            apiUrl = "https://fcc-weather-api.glitch.me/api/current?" + parameter;
            break;
            
        default:
            // Alerts the user if an improper request parameter was passed in and the returns false to terminate the function
            alert_modal("Netowrk Error!", "An invalid request was sent to the network manager.. Please try again.");
            return false;
    }

    if(!navigator.onLine) {
        alert_modal("Connectivity Issue!", "Your internet connection seems to be offline, please try again later.");
        return false;
    }

    // Sends out the fetch request based on the url set above
    fetch(apiUrl).then(function(response){
        if(response.ok) { response.json().then(function(data){
                switch(info_request) {
                    // Executes the repsective method once the data is received
                    case "countries":
                        countries_received(data);
                        break;
                    case "country-briefing":
                        brief_received(data);
                        break;
                    case "weather":
                        weather_received(data);
                        break
                    default:
                        alert_modal("Netowrk Error!", "An invalid request was sent to the network manager.. Please try again.");
                        return false;
                }
            });
        }
        else {
            // If the response from the fetch is anything but OK.
            alert_modal("Netowrk Error!", "An bad response was received back from the network request. Please try again.\n\nThe network response status code: " + response.status);
        } 
    });
}

// Handles the returned data from the api calls
function countries_received(country_data) {

    // When the data is received from the network call it saves it in the global variable and saves it to local storage for later use, the populates the drop-down

    country_list = country_data;
    window.localStorage.setItem("countries", JSON.stringify(country_data));
    populate_country_list();
}
function brief_received(brief_data) {

    console.log(brief_data);

    // Updates the page with the briefing data from the api

    // Clears the timer variable in the event there is another timer running
    clearInterval(world_time);

    // Calls the function set the time based on the received country timezone
    set_world_time(brief_data.timezone.name);

    // Gets the DOM elements to be updated
    const mapEl = document.getElementById("map");
    const title = document.getElementById("title_text");

    // Sets the title with the full name of the country
    title.innerHTML = brief_data.names.full;

    // Sets up map with the lat/long and zoom from the briefing object
    const lat = parseFloat(brief_data.maps.lat);
    const lng = parseFloat(brief_data.maps.long);
    const zoom = !brief_data.maps.zoom ? 4 : parseInt(brief_data.maps.zoom);

    // Converts the quadrant of the lat/long from +/- to the respective compass heading to be used with the maps' required url
    let map_lat = lat < 0 ? "S" + Math.abs(lat).toString() : "N" + lat.toString();
    let map_lng = lng < 0 ? "W" + Math.abs(lng).toString() : "E" + lng.toString();

    // Changes the map's source URL to show the respective country
    mapEl.src = "https://maps.google.com/maps?q="+ map_lat + map_lng + "&t=&z=" + zoom + "&ie=UTF8&iwloc=&output=embed";

    // Takes the lat/long from the country brief data received to get the the current weather information in the event it needs to be called again
    current_weather_request = "weather?lat=" + parseInt(lat) + "&lon=" + parseInt(lng);

    // Calls the other methods to display current conditions and average temps
    network_manager(current_weather_request);
    set_avg_temps(brief_data);
    set_currency(brief_data.currency);
    set_language(brief_data.language);
    set_electricity(brief_data.electricity);
    set_other_info(brief_data);
}
function weather_received(weather_data) {

    // Creates variables of the DOM elements to put the current weather data into
    const wx_iconEl = document.querySelector(".wx_icon");
    const current_tempEl = document.querySelector(".current_temp");
    const currents_wrapperEl = document.querySelector(".currents_wrapper");
    
    // Removes all child elements in the currents_wrapper div
     while(currents_wrapperEl.firstChild) {
        currents_wrapperEl.removeChild(currents_wrapperEl.firstChild);
    }

    // If weather is the "default" wx, re-requests destination's weather
    if (weather_data.name === "Shuzenji" && weather_attempts < 5) {
        weather_attempts++;
        network_manager(current_weather_request);
        return false;
    } else if (weather_data.name === "Shuzenji") {
        alert_modal("Current WX Error", "There seems to be an issue with the current weather information. Please try again to get the lastest current conditions.");
        wx_iconEl.innerHTML = "<img src='./assets/images/wx-icons/not-available.svg'>";
        weather_attempts = 0;
        return false;
    }

    console.log(weather_attempts, weather_data);

    // Resets the attempt counter
    weather_attempts = 0;

    // Getes the url for the wx icon image based on the weather condition id
    const wx_icon = get_wx_icon(weather_data.weather[0].id);

    // Puts the icon & temp into the DOM
    wx_iconEl.innerHTML = "<img src=" + wx_icon + ">";
    current_tempEl.innerHTML = format_temp(weather_data.main.temp);

   
    // Creates the tagboxes to display the other current conditions along with their respecitve elements and inserts the data
    for(i = 0; i < 6; i++) {

        let tag_label = null;
        let tag_value = null;

        switch(i) {
            case 0:
                tag_label = "Conditions";
                tag_value = weather_data.weather[0].main;
                 break;
            case 1:
                tag_label = "Today's High";
                tag_value = format_temp(weather_data.main.temp_max)
                break;
            case 2:
                tag_label = "Today's Low";
                tag_value = format_temp(weather_data.main.temp_min)
                break;
            case 3:
                tag_label = "Wind";
                tag_value = format_wind(weather_data.wind.deg, weather_data.wind.speed);
                break;
            case 4:
                tag_label = "Baro";
                tag_value = Math.round(weather_data.main.pressure) + " mb (" + (Math.round(weather_data.main.pressure * 0.0295 * 100)/100).toFixed(2) + " in.)";
                break;
             case 5:
               tag_label = "Humidity";
               tag_value = weather_data.main.humidity + "%";
               break;

               // More data can be entered here if desired
        }

        currents_wrapperEl.appendChild(create_tagbox(tag_label, tag_value));
    }
}
// If the list of available countries is not in local storage, then it will make an api call to get them and then store them in local storage
function get_countries() {
    // Checks to see if the list of countries is available in local storage. If it is, it puts it into the global variable.
    // If not, it makes a network call to retrieve the data from the api which will store it in local storage and put it in the global variable.

    let list = JSON.parse(window.localStorage.getItem("countries"));

    if(list) {
        country_list = list;
        populate_country_list();
    } else {
        network_manager("countries");
    }
}
// Puts the avaialbe countries into the drop-down option list
function populate_country_list() {

    // Dynamically adds an option element with each country's name to the drop down list so the country can be selected
    for(let i=0; i < country_list.length; i++) {
        const optionEl = document.createElement("option");
        optionEl.setAttribute("value", country_list[i].name);
        countryListEl.appendChild(optionEl);
    }
}

// Sets the DOM elements with received data
function set_world_time(timezone) {

    // Gets the current date/time in the selected country's timezone
    const country_dateEl = document.querySelector(".country_date");
    const country_timeEl = document.querySelector(".country_time");
    const country_timezoneEl = document.querySelector(".country_timezone");

    if(!timezone) {
        // If not timezone data is received it will clear out the current time and display that there's no data
        country_dateEl.innerHTML = "";
        country_timeEl.innerHTML = "<p style='width: 100%; font-size:large; text-align:center'; >No Timezone Data Received</p>";
        country_timezoneEl.innerHTML = "";
        return false;
    }

    // Gets the current hour in 24-hour format to determin if it's daytime or not
    const hour = moment().tz(timezone).format("H");
    isDayTime = hour < 18 && hour > 6 ? true : false;

    // Calculates the difference between assumed (guessed) user's timezone and selected country's
    const delta = moment.tz.zone(moment.tz.guess()).utcOffset(Date.now())/60 - moment.tz.zone(timezone).utcOffset(Date.now())/60;

    // Generates the string that tells the user what the difference in time is for the user
    let units = " hours ";
    let time_diff = null;

    // Combines the time difference with the units.  If the time is ahead it adds "+", likewise behind "-"
    // 1 hour difference will use singular form, all others would be plural
    if (delta !== 0) {
        if (Math.abs(delta) === 1) { units = " hour " };
        time_diff = delta < 0 ?  delta + units : "+" + delta + units;
    } else {
        time_diff = "0 hours"
    }

    // Sets the timer to fire every second so the time continuously updates while the page is displayed
    world_time = setInterval(function() {

        const time = moment().tz(timezone).format("h:mm");
        const part = moment().tz(timezone).format("A");
        const day = moment().tz(timezone).format("dddd, MMMM D, YYYY");

        // Inserts the selected country's formatted date and time into the DOM
        if(country_dateEl) { country_dateEl.innerHTML = "<p>" + day + "</p>"; }
        if(country_timeEl) { country_timeEl.innerHTML = "<p>" + time + "<span class='subscript'>" + part +  "</span><span class='time_diff'> (" + time_diff + ")</span></p>"; }
        if(country_timezoneEl) {  country_timezoneEl.innerHTML = "<p> Timezone (" + timezone + ")</p>"; }
    },  1000)
}
function set_avg_temps(temp_data) {

    // Creates the DOM elements and formats the data to display the reported average temps from the selected city

    // Used an array of months instead of having a long switch statement
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    // This is the main container hard-coded in the HTML file
    const average_temps = document.querySelector(".average_temps_wrapper");
    const legend = document.querySelector(".legend");

    // Clears out any children currently in the DOM
    while(average_temps.firstChild) {
        average_temps.removeChild(average_temps.firstChild);
    }

    // Ensures that the data is valid from the received data, if not it does not display any information
    if(temp_data.weather[months[0]].tMax == 100 && temp_data.weather[months[0]].tMin == -100 ) {
        average_temps.innerHTML = "<p>No Data Received</p>";
        legend.style.display = "none";
        return false;        
    }

    legend.style.display = "flex";

    // Creates the DOM elements for each month in the array and places them in the DOM
    for(let i=0; i < 12; i++) {

        const month_tag = create_tagbox( months[i].slice(0, 3), format_temp(temp_data.weather[months[i]].tAvg));

        // Determines if the average temp is hot/cold/nice and creates the appropriate class to be added to the tagbox
        let extreme_class = null;
        if (Math.round(temp_data.weather[months[i]].tAvg) > 25) {
            extreme_class = "is-hot";
        } else if (temp_data.weather[months[i]].tAvg < 10) {
            extreme_class = "is-cold"
        } else {
            extreme_class = "is-nice"
        }
        month_tag.classList.add("month_tagbox", "tagbox", extreme_class);

        // Adds the tagbox to the wrapper
        average_temps.appendChild(month_tag);
    }
}
function set_currency(currency_data) {
    const currencyEl = document.querySelector(".currency_wrapper");

    // Removes any previous currency data
    while(currencyEl.firstChild) {
        currencyEl.removeChild(currencyEl.firstChild);
    }

    if(!currency_data.code) {
        // Error
        currencyEl.appendChild(create_tagbox("Currency Used", "No Currency Data Provided"));
        return false;
    }

    // Uses the built-in number formatter and sets it to the current country's code
    const currency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency_data.code
    })

    // Gets the DOM elements to be used as a tagbox to hold the label and data
    const currency_name = create_tagbox("Currency Used", currency_data.name + " (" + currency_data.code + ")");
    const currency_rate = create_tagbox("Rate to USD", currency.format(currency_data.rate) + " = $1.00");

    currencyEl.append(currency_name, currency_rate);
}
function set_language(language_data) {
  // Updates the DOM with received language information

  // Creates a variable for the correct DOM element
  const languageEl = document.querySelector(".language_wrapper");

  // Clears any previous country's languages
  while (languageEl.firstChild) {
    languageEl.removeChild(languageEl.firstChild);
  }

  // Updates the DOM with any language information
  if (language_data.length === 0) {    
    // If there is no language data it will put a message in the DOM
    languageEl.appendChild(create_tagbox("Spoken Language", "No Language Data Provided"));
  
} else {
    
    // Get each language by iterating through the array of languages
    language_data.forEach(function (l) {
      const language = create_tagbox(
        "Spoken Language - " + l.language,
        "Official - " + l.official
      );
      languageEl.appendChild(language);
    });
  }
}
function set_electricity(electricity_data) {
  // Updates the DOM with received electricity information

  // Element from the DOM to place the data
  const electricity_wrapperEl = document.querySelector(".electricity_wrapper");

  // Clears out any previous data
  while (electricity_wrapperEl.firstChild) {
    electricity_wrapperEl.removeChild(electricity_wrapperEl.firstChild);
  }

  // Gets a tagbox with the voltage data
  if (electricity_data.voltage) {
    electricity_wrapperEl.appendChild(
      create_tagbox(
        "Voltage",
        electricity_data.voltage +
          " volts (" +
          electricity_data.frequency +
          "hz)"
      )
    );
  } else {
    electricity_wrapperEl.innerHTML = "<p>No Electrical Data Provided.</p>";
    return false;
  }

  // If there's no plug data it exit the function
  if (electricity_data.plugs.length === 0) {
    return false;
  }

  // Gets the plugs used and their respective images to be displayed on the page

  let plug_text = null;
  let plug_imgs = [];
  
  // Iterates through each of the plugs used and creates a string of the types and creates an array of the plug image urls from the plug data
  electricity_data.plugs.forEach(function (type, index) {
    if (index === 0) { plug_text = type; } else {plug_text = plug_text + ", " + type; } 
    plug_imgs.push(`./assets/images/plug-types/${type.toLowerCase()}.svg`);
  });

  // Adds the taboxes with the names and one for the images to the DOM
  electricity_wrapperEl.appendChild(create_tagbox("Plugs Used", plug_text));
  electricity_wrapperEl.appendChild(create_outlet_image_tagbox(plug_imgs));
  
}
function set_other_info(brief_data) {

    // Updates the DOM with received additional information

    const other_info_wrapperEl = document.querySelector(".other_info_wrapper");

    while(other_info_wrapperEl.firstChild) {
        other_info_wrapperEl.removeChild(other_info_wrapperEl.firstChild);
    }

    // Drinking Water
    const drinking_water = brief_data.water.short ? brief_data.water.short.toUpperCase() : "No Data Provided";
    const water_info = create_tagbox("Drinking Water", drinking_water);
    other_info_wrapperEl.appendChild(water_info);

    // Display vaccination recommendations, if any
    if(brief_data.vaccinations.length > 0) {
        brief_data.vaccinations.forEach(function(v) {
            other_info_wrapperEl.appendChild(create_tagbox("Vaccination - " + v.name,v.message));
        });
    }
}

// Misc functions
function format_wind(degrees, speed) {

    // Formats the wind to be be NE 5mph instead of using the the decimal speed and degrees (e.g. speed: 5.11343 and degrees: 64.333)

    let direction = null;

    // Rounds the speed to the nearest int
    let mph = Math.round(speed)

    // Sets the compass direction based the reported degrees
    if(degrees >= 25 && degrees < 65) {
        direction = "NE";
    } else if(degrees >= 65 && degrees < 115) {
        direction = "E";
    } else if(degrees >= 115 && degrees < 155) {
        direction = "SE";
    } else if (degrees >= 155 && degrees < 215) {
        direction = "S";
    } else if (degrees >= 215 && degrees < 245) {
        direction = "SW";
    } else if (degrees >= 245 && degrees < 295) {
        direction = "W";
    } else if (degrees >= 295 && degrees < 335) {
        direction = "NW"
    } else {
        direction = "N";
    }

    return direction + " " + mph + "mph";
}
function format_temp(celsius) {
    // Takes the celsius temp converts to Fahrenheit and returns a string with a formatted output i.e. 15C (59F)

    const cel_format = Math.round(celsius) + "\u2103";
    const far_format = " (" + parseInt(Math.round(celsius) * 9/5 + 32) + "\u2109)";
    return cel_format + far_format;
}
function get_brief_url(selection) {

    // returns the url of the select country, if there is no URL it will return a null

    let inList = null;

    country_list.forEach(element => {
        if(element.name === selection) {
            inList = element.url;
        }
    });

    return inList;
}
function get_wx_icon(code) {
    
    // Returns the respective wx_icon url based on the weather id code and if it's day/night
    
    let wx_icon = null;
    
    switch(true) {
        case (code < 300): // Thunderstorm
            wx_icon = "./assets/images/wx-icons/thunderstorms-day.svg"
            break;
        case (code < 500): // Drizzle
            wx_icon = "./assets/images/wx-icons/partly-cloudy-day-drizzle.svg"
            break;
        case (code < 600): // Rain
            wx_icon = "./assets/images/wx-icons/partly-cloudy-day-rain.svg"
            break;
        case (code < 800): // Snow
            wx_icon = "./assets/images/wx-icons/partly-cloudy-day-snow.svg"
            break;
        case (code === 800): // Clear
            wx_icon = "./assets/images/wx-icons/clear-day.svg"        
            break;
        
        case (code === 801): // Few
        case (code === 802): // Scattered
        case (code === 803): // Broken
            wx_icon = "./assets/images/wx-icons/partly-cloudy-day.svg"
            break;

        case (code < 900): // Overcast
            wx_icon = "./assets/images/wx-icons/overcast-day.svg"
            break;
    }

    // If the code doesn't match with a condition, it will return a no-data icon
    if(!wx_icon) {
        return "./assets/images/wx-icons/code-red.svg";
    
    // If it's not daytime, then it will replace day with night into the url
    } else if (!isDayTime) {
        return wx_icon.replace("day", "night")
    } else {
        return wx_icon;
    }   
}
function create_tagbox(label, value) {

    const tagboxEl = document.createElement("div");
    const tag_label = document.createElement("p");
    const tag_value = document.createElement("p");

    tagboxEl.classList.add("tagbox")
    tag_label.classList.add("tagbox_label");
    tag_value.classList.add("tagbox_value");

    tagboxEl.classList.add("tagbox");
    tag_label.classList.add("tagbox_label");
    tag_value.classList.add("tagbox_value");

    tag_label.innerHTML = label;
    tag_value.innerHTML = value;

    tagboxEl.append(tag_label, tag_value);

    return tagboxEl;
}
function alert_modal(title, message) {
    const modal_TitleEl = document.querySelector(".modal-title");
    const modal_MsgEl = document.querySelector(".modal-msg");
    const modal_Button = document.querySelector(".modal-button");
    modal_TitleEl.innerHTML = "<p>" + title + "</p>";
    modal_MsgEl.innerHTML = "<p>" + message + "</p>";
    modalEl.style.display = "block";
    modal_Button.focus();
}
function create_outlet_image_tagbox(urlArray) {
  
  const tagboxEl = document.createElement("div");
  
  urlArray.forEach(function (url) {
    const newImage = document.createElement("img");
    newImage.setAttribute("src", url);
    tagboxEl.append(newImage);
    newImage.classList.add("imgsize");
  });

  tagboxEl.classList.add("imgbox");

  return tagboxEl;
}

// Event listeners that are initiated on page load
countryNameEl.addEventListener('change', function(event) {
    // Triggers when the user selects a country from the drop-down list

    // Gets the url of the briefing for the selected country
    const brief_url = get_brief_url(event.target.value);
    
    event.target.blur();

    // Makes sure there is a url and sends the request to the network manager
    if(brief_url) {
        clearInterval(set_world_time);
        network_manager("country-briefing?" + brief_url);
        countryNameEl.value = "";
    } else {

        //Need to remove alert and add modal
        alert_modal("User Input Error!", "No country name exists in the database that matches your selection. Please select a country from the drop-down list.");
        countryNameEl.value = "";
    }
});
modalEl.addEventListener('click', function(event) {
    modalEl.style.display = "none";
});

// Loads the countries into the drop down on page load
get_countries();
