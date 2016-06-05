
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

function newEhr(callback) {
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
    if (stPacienta === 1) {
        newEhr(function(ehrId) {
            submitData(ehrId, "", "176", "140", "", "", "", "", function() {});
            submitData(ehrId, "", "176", "142", "", "", "", "", function() {});
            submitData(ehrId, "", "176", "137", "", "", "", "", function() {});
            submitData(ehrId, "", "177", "128", "", "", "", "", function() {});
            $("#samples").html($("#samples").html() + "<option value='" + ehrId + "'>" + ehrId + "</option>");
        });
    }
    else if (stPacienta === 2) {
        newEhr(function(ehrId) {
            submitData(ehrId, "", "", "156", "", "131", "87", "", function() {});
            submitData(ehrId, "", "", "156", "", "133", "85", "", function() {});
            submitData(ehrId, "", "", "153", "", "132", "85", "", function() {});
            submitData(ehrId, "", "", "147", "", "129", "83", "", function() {});
            $("#samples").html($("#samples").html() + "<option value='" + ehrId + "'>" + ehrId + "</option>");
        });
    }
    else {
        newEhr(function(ehrId) {
            submitData(ehrId, "", "", "", "41", "", "", "", function() {});
            submitData(ehrId, "", "", "", "40", "", "", "", function() {});
            submitData(ehrId, "", "", "", "39", "", "", "", function() {});
            submitData(ehrId, "", "", "", "38", "", "", "", function() {});
            $("#samples").html($("#samples").html() + "<option value='" + ehrId + "'>" + ehrId + "</option>");
        });
    }
    
    // TODO: Potrebno implementirati
    
    //return ehrId;
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
	var result = "<table><tr><th></th><th>Date and time</th><th>";
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
	            result += "<tr><td>" + (data.length - i) + "</td>";
	            //var splitTime = data[i].time.split(":");
                //result += "<td>" + splitTime[0]+":"+splitTime[1] + "</td><td>";
                result += "<td>" + data[i].time + "</td><td>";
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

function generateChart(div, ehrId, dataType) {
    getData(ehrId, dataType, function(error, data) {
        if (! error) {
            var svgId = dataType + "-d3";
            div.html("<svg id='" + svgId + "' width='100%' height='100%'></svg>");
            
            var domain;
            switch (dataType) {
                case "height":
                    domain = [0, 250]
                    break;
                case "weight":
                    domain = [0, 250];
                    break;
                case "temperature":
                    domain = [30, 45];
                    break;
                case "pressure":
                    domain = [60, 140];
                    break;
                case "oxygen":
                    domain = [85, 100];
                    break;
                default:
                    domain = [0, 300];
            }
            
            var vis = d3.select("#" + svgId),
                WIDTH = $("#" + svgId).parent().width(),
                HEIGHT = $("#" + svgId).parent().height(),
                MARGINS = {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 50
                },
                xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([1,data.length]),
                yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain(domain),
                xAxis = d3.svg.axis()
                    .scale(xScale),
                yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left");
            
            vis.append("svg:g")
                .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
                .call(xAxis);
            
            vis.append("svg:g")
                .attr("transform", "translate(" + (MARGINS.left) + ",0)")
                .call(yAxis);
            
            var lineGen = d3.svg.line()
                .x(function(data) {
                return xScale(data.num);
                })
                .y(function(data) {
                return yScale(data.val);
                });
            
            var values = new Array(data.length);
            for (var i in data) {
                values[values.length - i - 1] = { num: values.length - i };
                switch (dataType) {
                    case "pressure":
                        values[values.length - i - 1].val = data[i].systolic;
                        break;
                    case "oxygen":
                        values[values.length - i - 1].val = data[i].spO2;
                        break;
                    default:
                        values[values.length - i - 1].val = data[i][dataType];
                }
            }
            
            vis.append('svg:path')
                .attr('d', lineGen(values))
                .attr('stroke', 'blue')
                .attr('stroke-width', 1)
                .attr('fill', 'none');
            
            if (dataType === "pressure") {
                for (var i in data) {
                    values[values.length - i - 1].val = data[i].diastolic;
                }
                
                vis.append('svg:path')
                    .attr('d', lineGen(values))
                    .attr('stroke', 'green')
                    .attr('stroke-width', 1)
                    .attr('fill', 'none');
            }
        }
        else {
            div.html("Error: " + JSON.parse(error.responseText).userMessage);
        }
    });
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
    $("#generate-samples").click(function() {
        generirajPodatke(1);
        generirajPodatke(2);
        generirajPodatke(3);
    });
    
    $("#samples").change(function() {
        $("#ehr-id-input").val($(this).val());
    });
    
    $("#new-ehr-button").click(function() {
        newEhr(function(ehrId) {
            $("#ehr-id-input").val(ehrId);
            alert("Your new EHR ID is " + ehrId);
        });
    });
    
    $("#submit-data").click(function() {
        var ehrId = $("#ehr-id-input").val();
        if (ehrId == "") {
            $("#ehr-id-input").css("background-color", "#ff7f7f");
        }
        else {
            $("#ehr-id-input").css("background-color", "white");
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
            outputDiv.children(".data").html("<div class='no-ehr-id'>Enter your EHR ID to see data</div>");
            outputDiv.children(".chart").html("<div class='no-ehr-id'>Enter your EHR ID to see data</div>");
        }
        else {
            $("#ehr-id-input").css("background-color", "white");
            generateTable(outputDiv.children(".data"), ehrId, dataType);
            generateChart(outputDiv.children(".chart"), ehrId, dataType);
        }
        
        generateAdditionalInfo(outputDiv.children(".about"), dataType);
        outputDiv.slideToggle();
    });
})