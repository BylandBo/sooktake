//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var messageModule = require('./message');
var pushModule = require('./pushmessage');

var AV = require('leanengine');

AV.Cloud.define("CheckUpdateFlightJob", function(request, status) {
  var Flight = AV.Object.extend(classnameModule.GetFlightClass());
  var flightQuery = new AV.Query(Flight);
	
  flightQuery.lessThan("time", new Date());
  flightQuery.notContainedIn("status",[messageModule.FlightStatus_Completed(), messageModule.FlightStatus_Full(), messageModule.FlightStatus_Overdue()]);

  flightQuery.each(function(flight) {
      // Set and save the change
      flight.set("status", messageModule.FlightStatus_Overdue());
      return flight.save();
  }).then(function() {
    // Set the job's success status
    status.success("Flight Update completed successfully.");
  }, function(error) {
    // Set the job's error status
	console.log(error.message);
    status.error("Uh oh, something went wrong.");
  });
});