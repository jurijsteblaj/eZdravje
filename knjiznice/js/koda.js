
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


// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija
$(document).ready(function() {
    $(function() {
      $( "#master-detail" ).accordion();
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
                $("#response").text("Your new EHR ID is " + ehrId);
                $("#ehr-id").val(ehrId);
            });
        }
        else {
            $("#response").text("Complete all fields to create a new EHR");
        }
    });
})