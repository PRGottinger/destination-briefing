let country_list = [];
const countryNameEl = document.getElementById("country_name");
const countryListEl = document.getElementById("country_list");


// Handles asynchronous fetch requests and then calls the respective method to handle the data once its received 
function network_manager(request) {
    
    let apiUrl = null;

    const info_request = request.split("?")[0].trim();
    const parameter = request.split("?")[1];
    
    // Sets the apiUrl depending on which data is being fetched
    switch(info_request){
        case "latest-rates":
            // Gets the latest exchange rate data from OpenExchange's API

            // If no base country is passed in it will default to USD
            const base = !parameter ? "USD" : parameter.trim();

            apiUrl = "https://openexchangerates.org/api/latest.json?base=" + base + "&app_id=801157a5b7c8404aacf491bfd6a1b2f4";
            break;
        case "currencies":
            // Gets an array of all the available countries and their respective currency codes (e.g. USD) from OpenExchange's API
            
            apiUrl = "https://openexchangerates.org/api/currencies.json";
            break;
        case "countries":
            // Gets an array of all the available countries, their full names, country codes amd briefing URL from TravelBriefing's API
            
            apiUrl = "https://travelbriefing.org/countries?format=json";
            break;
        case "country-briefing":
            // Gets an object of the breifing data from TravelBriefing's API for the country that was passed in with the request
            
            apiUrl = parameter + "?format=json";
            break;
        default:
            alert("Invalid Request!")
            return false;
    }

    fetch(apiUrl).then(function(response){
        if(response.ok) {
            response.json()
            .then(function(data){
                switch(info_request) {
                    // Executes the repsective method once the data is received
                    case "latest-rates":
                        latest_rates_received(data);
                        break;
                    case "currencies":
                        currencies_received(data);
                        break;
                    case "countries":
                        countries_received(data)
                        break;
                    case "country-briefing":
                        brief_received(data);
                        break;
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

function latest_rates_received(rate_data) {
    console.log(rate_data);
}

function currencies_received(currency_data) {
    console.log(currency_data);
}

function countries_received(country_data) {
    // When the data is recieved from the network call it saves it in the global variable and saves it to local storage for later use
    country_list = country_data;
    window.localStorage.setItem("countries", JSON.stringify(country_data));
    populate_country_list();
}

function brief_received(brief_data) {

    console.log("Country Object Received", brief_data);

    const mapEl = document.getElementById("map");
    const title = document.getElementById("title_text");
    
    // Set title
    title.textContent = brief_data.names.full;

    // Sets up map with the lat/long and zoom from the briefing object
    const lat = parseFloat(brief_data.maps.lat);
    const lng = parseFloat(brief_data.maps.long);
    const zoom = parseInt(brief_data.maps.zoom);

    // Converts the quadrant of the lat/long from +/- to the respective compass heading
    let map_lat = lat < 0 ? "S" + Math.abs(lat).toString() : "N" + lat.toString(); 
    let map_lng = lng < 0 ? "W" + Math.abs(lng).toString() : "E" + lng.toString();
   
    // Changes the map's source URL to show the respective country
    mapEl.src = "https://maps.google.com/maps?q="+ map_lat + map_lng + "&t=&z=" + zoom + "&ie=UTF8&iwloc=&output=embed";

}


// Misc functions

function get_countries() {
    // Checks to see if the list of countries is available in local storage. If it is, it puts it into the global variable.
    // If not, it makes a network call to retrieve the data from the api which will store it in local storgae and put it in the global variable.

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

function getBriefingUrl(selection) {
    // returns the url of the select country, if there is no URL it will return a null
    
    let inList = null;
    
    country_list.forEach(element => {    
        if(element.name === selection) {
            inList = element.url;
        }
    });

    return inList;
}


// Start of the event listeners
countryNameEl.addEventListener('change', function(event) {
    // Triggers when the user selects a country from the drop-down list
    
    // Gets the url of the briefing for the selected country
    const brief_url = getBriefingUrl(event.target.value);

    // Makes sure there is a url and sends the request to the network manager
    if(brief_url) { 
        network_manager("country-briefing?" + brief_url);
        countryNameEl.value = "";
    } else {
        alert("No matching country has been selected! Please select a copy on the list");
        countryNameEl.focus();
    }
});
   

// Loads the countries into the drop down on page load
get_countries();