
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function newEhr(firstName, lastName, dateOfBirth, callback) {
    var sessionId = getSessionId();
    
    $.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
	    url: baseUrl + "/ehr",
	    type: "POST",
	    success: function(data) {
            var ehrId = data.ehrId;
            var partyData = {
                firstNames: firstName,
                lastNames: lastName,
                dateOfBirth: dateOfBirth,
                partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
            };
            $.ajax({
                url: baseUrl + "/demographics/party",
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(partyData),
                success: function (party) {
                    if (party.action == 'CREATE') {
                        callback(ehrId);
                    }
                }
            });
        }
	});
}

function submitData(ehrId, dateAndTime, height, weight, temperature,
        systolicBP, diastolicBP, oxygen, callback) {
            
    var sessionId = getSessionId();
    
    var data = {
        "ctx/language": "en",
        "ctx/territory": "SI",
        "ctx/time": dateAndTime,
	    "vital_signs/height_length/any_event/body_height_length": height,
	    "vital_signs/body_weight/any_event/body_weight": weight,
	   	"vital_signs/body_temperature/any_event/temperature|magnitude": temperature,
	    "vital_signs/body_temperature/any_event/temperature|unit": "°C",
	    "vital_signs/blood_pressure/any_event/systolic": systolicBP,
	    "vital_signs/blood_pressure/any_event/diastolic": diastolicBP,
	    "vital_signs/indirect_oximetry:0/spo2|numerator": oxygen
    }
    
    var parameters = {
	    ehrId: ehrId,
	    templateId: 'Vital Signs',
	    format: 'FLAT'
	};
	
	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	
	$.ajax({
	    url: baseUrl + "/composition?" + $.param(parameters),
	    type: 'POST',
	    contentType: 'application/json',
	    data: JSON.stringify(data),
	    success: function (response) {
	        callback(undefined, response);
	    },
	    error: function(error) {
	    	callback(error);
	    }
	});
}

/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta) {
  ehrId = "";

  // TODO: Potrebno implementirati

  return ehrId;
}

function getData(ehrId, dataType, callback) {
    var sessionId = getSessionId();
    
    $.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	
	var urlSuffix;
	switch (dataType) {
        case "temperature":
            urlSuffix = "body_temperature";
            break;
        case "pressure":
            urlSuffix = "blood_pressure";
            break;
        case "oxygen":
            urlSuffix = "spO2";
            break;
        default:
            urlSuffix = dataType;
	}
	
	$.ajax({
	    url: baseUrl + "/view/" + ehrId + "/" + urlSuffix,
	    type: "GET",
        success: function(data) {
            callback(false, data);
	    },
	    error: function(error) {
	        callback(error);
	    }
	});
}

function generateTable(div, ehrId, dataType) {
	var result = "<table><tr><th>Date and time</th><th>";
	switch (dataType) {
	    case "oxygen":
	        result += "Oxygen level";
	        break;
	    case "pressure":
	        result += "Systolic pressure</th><th>Diastolic pressure"
	        break;
	    default:
	        result += dataType.charAt(0).toUpperCase() + dataType.slice(1);
	}
	result += "</th></tr>"
	
	getData(ehrId, dataType, function(error, data) {
	    if (! error) {
	        for (var i in data) {
                result += "<tr><td>" + data[i].time + "</td><td>";
                switch (dataType) {
                    case "pressure":
                        result += data[i].systolic + data[i].unit +"</td><td>" +
                            data[i].diastolic + data[i].unit;
                        break;
                    case "oxygen":
                        result += data[i].spO2;
                        break;
                    default:
                        result += data[i][dataType] + " " + data[i].unit;
                }
                result += "</td></tr>";
            }
            result += "</table>";
            div.html(result);
	    }
	    else {
	        div.html("Error: " + JSON.parse(error.responseText).userMessage);
	    }
	});
}

function generateChart() {
    
}

var duckduckgoCache = {};
function generateAdditionalInfo(div, dataType) {
    if (duckduckgoCache[dataType]) {
        div.html(duckduckgoCache[dataType]);
    }
    else {
        var query;
        switch (dataType) {
            case "temperature":
                query = "human+body+temperature";
                break;
            case "height":
                query = "human+height";
                break;
            case "weight":
                query = "human+body+weight";
                break;
            case "pressure":
                query = "human+blood+pressure"
                break;
            case "oxygen":
                query = "blood+oxygen+level"
                break;
        }
        var url = "https://api.duckduckgo.com/?q=" + query + "&t=HealthTrack" + 
            "&ia=about&format=json&callback=?";
        var ddgSearchLink = "https://api.duckduckgo.com/?q=" + query +
            "&t=HealthTrack&ia=about";
        $.getJSON({
            url,
            success: function(data) {
                var abstract = data.AbstractText;
                var result;
                if (abstract != "") {
                    var attribution = "&mdash; <a target='_blank' href='" +
                        data.AbstractURL + "'>" + data.AbstractSource + "</a>\
                        <br />\
                        <img heigth='50' width='63' src='img/ddg.png'>\
                        <a target='_blank' href='https://duckduckgo.com/'>Results from DuckDuckGo</a>\
                        (<a target='_blank' href='" + ddgSearchLink + "'>results link</a>)";
                    result = abstract + "<br />" + attribution;
                }
                else {
                    result = "<a target='_blank' href='" + ddgSearchLink +
                        "'>Click here to learn about this vital sign</a>";
                }
                duckduckgoCache[dataType] = result;
                div.html(result);
            }
        });
    }
}

// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija
$(document).ready(function() {
    $(function() {
      $( "#master-detail" ).accordion({heightStyle: 'panel'});
    });
    
    $("#new-ehr-button").click(function() {
        $("#cover").css("display", "block");
        $("#new-ehr-popup").css("display", "block");
    });
    
    $("#new-ehr-cancel").click(function() {
        $("#cover").css("display", "none");
        $("#new-ehr-popup").css("display", "none");
    });
    
    $("#new-ehr-create").click(function() {
        var emptyFields = false;
        var inputFields = $("#new-ehr-popup input[type=text]");
        var firstName = $("#first-name").val();
        var lastName = $("#last-name").val();
        var dateOfBirth = $("date-of-birth").val(); // TODO: do I even need DoB?
        for (var i = 0; i < inputFields.length; i++) { //TODO: switch up vital signs? find those you can measure at home?
            var inputField = $(inputFields[i]);
            if (inputField.val() == "") {
                emptyFields = true;
                inputField.css("background-color", "#ff7f7f");
            }
            else {
                inputField.css("background-color", "#7fff7f");
            }
        }
        
        if (! emptyFields) {
            var ehrId = newEhr(firstName, lastName, dateOfBirth, function(ehrId) {
                $("#new-ehr-response").text("Your new EHR ID is " + ehrId);
                $("#ehr-id").val(ehrId);
            });
        }
        else {
            $("#new-ehr-response").text("Complete all fields to create a new EHR");
        }
    });
    
    $("#submit-data").click(function() {
        var ehrId = $("#ehr-id-input").val();
        if (ehrId == "") {
            $("#ehr-id-input").css("backfround-color", "#ff7f7f");
        }
        else {
            $("#ehr-id-input").css("backfround-color", "white");
            var dateAndTime = $("#date-and-time-input").val();
            var height = $("#height-input").val();
            var weight = $("#weight-input").val();
            var temperature = $("#temperature-input").val();
            var systolicBP = $("#systolic-input").val();
            var diastolicBP = $("#diastolic-input").val();
            var oxygen = $("#oxygen-input").val();
            
            submitData(ehrId, dateAndTime, height, weight, temperature,
                systolicBP, diastolicBP, oxygen, function(error, response) {
                    if (! error) {
                        $("#submit-response").text("Data successfully entered");
                    }
                    else {
                        $("#submit-response").text("Error: " +
                            JSON.parse(error.responseText).userMessage);
                    }
                });
        }
    });
    
    $("#master-detail > h3").click(function() {
        var ehrId = $("#ehr-id-input").val();
        
        var outputDiv = $(this).next();
        var dataType = outputDiv.attr("id").split("-")[0];
        if (ehrId == "") {
            $("#ehr-id-input").css("background-color", "#ff7f7f");
        }
        else {
            $("#ehr-id-input").css("background-color", "white");
            generateTable(outputDiv.children(".data"), ehrId, dataType);
        }
        
        generateAdditionalInfo(outputDiv.children(".about"), dataType);
        
    });
})