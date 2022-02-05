let country_list = [];
let world_time = null;
let current_weather_request = null;
let weather_attempts = 0;
let isDayTime = null;

const countryNameEl = document.getElementById("country_name");
const countryListEl = document.getElementById("country_list");

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

            alert("Invalid Request!")
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
                }
            });
        }
        else {
            // If the response from the fetch is anything but OK.
            alert("A network error has occured!\n\n" + response);
        } 
    });
}

// Start of received data handlers
function countries_received(country_data) {
   
    // When the data is recieved from the network call it saves it in the global variable and saves it to local storage for later use, the populates the drop-down
   
    country_list = country_data;
    window.localStorage.setItem("countries", JSON.stringify(country_data));
    populate_country_list();
}
function brief_received(brief_data) {

    // Updates the page with the briefing data from the api



    // Clears the timer variable in the event there is another timer running
    clearInterval(world_time);
    
    // Calls the function set the time based on the received country timezone    
    set_world_time(brief_data.timezone.name);

    // Gets the DOM elements to be updated
    const mapEl = document.getElementById("map");
    const title = document.getElementById("title_text");

    // Sets the title with the full name of the country
    title.textContent = brief_data.names.full;

    // Sets up map with the lat/long and zoom from the briefing object
    const lat = parseFloat(brief_data.maps.lat);
    const lng = parseFloat(brief_data.maps.long);
    const zoom = parseInt(brief_data.maps.zoom);

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

    // ADD ADDITION METHOD CALLS HERE TO DISPLAY (I.E. LANGUAGE, CURRENCY, ADVISORIES AND ELECTRICITY) AFTER THAT DATA IS RECEIVED FROM THE API
}
function weather_received(weather_data) {

    // If weather is the "default" wx, re-requests destination's weather
    if (weather_data.name === "Shuzenji" && weather_attempts < 5) {
        weather_attempts++;
        network_manager(current_weather_request);
    }

    // Resets the attempt counter
    weather_attempts = 0;

    // Creates DOM elements to put the weather data into
    const wx_iconEl = document.querySelector(".wx_icon");
    const current_tempEl = document.querySelector(".current_temp");
    const currents_wrapperEl = document.querySelector(".currents_wrapper");

    // Getes the url for the wx icon image based on the weather condition id
    const wx_icon = get_wx_icon(weather_data.weather[0].id);

    // Puts the icon & temp into the DOM
    wx_iconEl.innerHTML = "<img src=" + wx_icon + ">";
    current_tempEl.innerHTML = format_temp(weather_data.main.temp);
    
    // Removes all child elements in the currents_wrapper div
    while(currents_wrapperEl.firstChild) {
        currents_wrapperEl.removeChild(currents_wrapperEl.firstChild);
    }
    
    // Creates the tagboxes to display the other current conditions along with their respecitve elements and inserts the data
    for(i = 0; i < 6; i++) {
        const current_tag = document.createElement("div");
        current_tag.classList.add("current_tagbox", "tagbox");

        const tag_label = document.createElement("p");
        tag_label.classList.add("tagbox_label");

        const tag_value = document.createElement("p");
        tag_value.classList.add("tagbox_value");
        
        switch(i) {
            case 0:
                tag_label.textContent = "Conditions";
                tag_value.textContent = weather_data.weather[0].main;
                 break;
            case 1:
                tag_label.textContent = "Today's High";
                tag_value.textContent = format_temp(weather_data.main.temp_max)
                break;
            case 2:
                tag_label.textContent = "Today's Low";
                tag_value.textContent = format_temp(weather_data.main.temp_min)
                break;
            case 3:
                tag_label.textContent = "Wind";
                tag_value.textContent = format_wind(weather_data.wind.deg, weather_data.wind.speed);
                break;
            case 4:
                tag_label.textContent = "Baro";
                tag_value.textContent = Math.round(weather_data.main.pressure) + " mb (" + (Math.round(weather_data.main.pressure * 0.0295 * 100)/100).toFixed(2) + " in.)";
                break;
             case 5:
               tag_label.textContent = "Humidity";
               tag_value.textContent = weather_data.main.humidity + "%";
               break;
               
               // More data can be entered here if desired
        }

        current_tag.append(tag_label, tag_value);
        currents_wrapperEl.appendChild(current_tag);
    }

    // Additional items we could add to the currents
    // const wx_main = weather_data.weather[0].main;       
    // const cloud_coverage = weather_data.clouds.all;
    // const cloud_code = weather_data.clouds.code;
    // const temp_hi = weather_data.main.temp_max;
    // const temp_low = weather_data.main.temp_min;
    // const visibility = weather_data.main.visibility;
    // const description = weather_data.weather[0].description;

}

// Misc functions
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
function populate_country_list() {    
    
    // Dynamically adds an option element with each country's name to the drop down list so the country can be selected
    for(let i=0; i < country_list.length; i++) {
        const optionEl = document.createElement("option");
        optionEl.setAttribute("value", country_list[i].name);
        countryListEl.appendChild(optionEl);
    }
}
function set_brief_url(selection) {
    
    // returns the url of the select country, if there is no URL it will return a null
    
    let inList = null;
    
    country_list.forEach(element => {    
        if(element.name === selection) {
            inList = element.url;
        }
    });

    return inList;
}
function set_world_time(timezone) {
 
    // Gets the current date/time in the selected country's timezone

    const country_dateEl = document.querySelector(".country_date");
    const country_timeEl = document.querySelector(".country_time");

    // Gets the current hour in 24-hour format to determin if it's daytime or not
    const hour = moment().tz(timezone).format("H");
    isDayTime = hour < 18 && hour > 6 ? true : false;
   
    // Calculates the difference between assumed (guessed) user's timezone and selected country's
    const delta = moment.tz.zone(moment.tz.guess()).utcOffset(Date.now())/60 - moment.tz.zone(timezone).utcOffset(Date.now())/60;

    // Generates the string that tells the user what the difference in time is for the user
    let units = " hours ";
    let time_diff = null;

    // If it's the time difference is 1, it will use a single unit.  Anything else will use the plural.
    if (delta !== 0) {
        if (Math.abs(delta) === 1) { units = " hour " };
        time_diff = delta < 0 ?  delta + units : "+" + delta + units;
    }
 
    // Sets the timer to fire every second so the time continuously updates while the page is displayed
    world_time = setInterval(function() {

        const time = moment().tz(timezone).format("h:mm");
        const part = moment().tz(timezone).format("A");
        const day = moment().tz(timezone).format("dddd, MMMM D, YYYY");

        // Inserts the selected country's formatted date and time into the DOM
        if(country_timeEl) { country_timeEl.innerHTML = "<p>" + time + "<span class='subscript'>" + part +  "</span><span class='time_diff'> (" + time_diff + ")</span></p>"; }
        if(country_dateEl) { country_dateEl.innerHTML = "<p>" + day + "</p>"; }
    },  1000)
}
function format_temp(celsius) {
    // Takes the celsius temp converts to Fahrenheit and returns a string with a formatted output i.e. 15C (59F)
    
    const cel_format = Math.round(celsius) + "\u2103";
    const far_format = " (" + parseInt(Math.round(celsius) * 9/5 + 32) + "\u2109)";
    return cel_format + far_format;
}
function set_avg_temps(temp_data) {
    
    // Creates the DOM elements and formats the data to display the reported average temps from the selected city

    // Used an array of months instead of having a long switch statement
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    // This is the main container hard-coded in the HTML file
    const temp_wrapperEl = document.querySelector(".average_temps_wrapper");

    // Clears out any children currently in the DOM
    while(temp_wrapperEl.firstChild) {
        temp_wrapperEl.removeChild(temp_wrapperEl.firstChild);
    }

    // Creates the DOM elements for each month in the array and places them in the DOM
    for(let i=0; i < 12; i++) {

        // Determines if the average temp is hot/cold/nice and creates the appropriate class to be added to the tagbox
        let extreme_class = null;
        if (Math.round(temp_data.weather[months[i]].tAvg) > 25) {
            extreme_class = "is-hot";
        } else if (temp_data.weather[months[i]].tAvg < 10) {
            extreme_class = "is-cold"
        } else {
            extreme_class = "is-nice"
        }

        // Div to hold both the month name <p> and avg temp <p>
        const month_tag = document.createElement("div");
        month_tag.classList.add("month_tagbox", "tagbox", extreme_class);

        // Month name label <p>, abbreviates the month name with just the first 3 letters
        const tag_label = document.createElement("p");
        tag_label.classList.add("tagbox_label");
        tag_label.textContent = months[i].slice(0, 3);

        // Month avg temp <p>, calls the format temp to display both C and F
        const tag_value = document.createElement("p");
        tag_value.classList.add("tagbox_value");
        tag_value.textContent = format_temp(temp_data.weather[months[i]].tAvg);       
        
        // appends the children to their respective parent to display in the DOM
        month_tag.append(tag_label, tag_value);
        temp_wrapperEl.appendChild(month_tag);
    }
}
function format_wind(degrees, speed) {
    
    // Formats the wind to be be NE 5mph instead of using the the decimal speed and degrees (e.g. speed: 5.11343 and degrees: 64.333)

    let direction = null;
    
    // Rounds the speed to the nearest int
    let mph = Math.round(speed)

    // Sets the compass direction based the reported degreess 
    if(degrees => 25 && degrees < 65) {
        direction = "NE";
    } else if(degrees => 65 && degrees < 115) {
        direction = "E";
    } else if(degrees => 115 && degrees < 155) {
        direction = "SE";
    } else if (degrees => 155 && degrees < 215) {
        direction = "S";
    } else if (degrees => 215 && degrees < 245) {
        direction = "SW";
    } else if (degrees => 245 && degrees < 295) {
        direction = "W";
    } else if (degrees => 295 && degrees < 335) {
        direction = "NW"
    } else {
        direction = "N";
    }

    return direction + " " + mph + "mph"; 
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

// Event listeners that are initiated on page load
countryNameEl.addEventListener('change', function(event) {
    // Triggers when the user selects a country from the drop-down list
    
    // Gets the url of the briefing for the selected country
    const brief_url = set_brief_url(event.target.value);

    // Makes sure there is a url and sends the request to the network manager
    if(brief_url) { 
        clearInterval(set_world_time);
        network_manager("country-briefing?" + brief_url);
        countryNameEl.value = "";
    } else {
        alert("No matching country has been selected! Please select a copy on the list");
        countryNameEl.focus();
    }
});
   
// Loads the countries into the drop down on page load
get_countries();
